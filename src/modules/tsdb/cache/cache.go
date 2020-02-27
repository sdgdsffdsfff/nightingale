package cache

import (
	"fmt"
	"log"
	"sync"
	"sync/atomic"
	"time"

	"github.com/didi/nightingale/src/modules/tsdb/utils"

	"github.com/toolkits/pkg/logger"
)

type CacheSection struct {
	SpanInSeconds    int `yaml:"spanInSeconds"`
	NumOfChunks      int `yaml:"numOfChunks"`
	ExpiresInMinutes int `yaml:"expiresInMinutes"`
	DoCleanInMinutes int `yaml:"doCleanInMinutes"`
	FlushDiskStepMs  int `yaml:"flushDiskStepMs"`
}

const SHARD_COUNT = 256

var (
	Caches caches
	Config CacheSection
)

var (
	TotalCount int64
	cleaning   bool
)

type (
	caches []*cache
)

type cache struct {
	Items map[interface{}]*CS // [counter]ts,value
	sync.RWMutex
}

func Init(cfg CacheSection) {
	Config = cfg
	InitCaches()
	go StartCleanup()
}

func InitCaches() {
	Caches = NewCaches()
}

func InitChunkSlot() {
	size := Config.SpanInSeconds * 1000 / Config.FlushDiskStepMs
	if size < 0 {
		log.Panicf("store.init, bad size %d\n", size)
	}

	ChunksSlots = &ChunksSlot{
		Data: make([]map[interface{}][]*Chunk, size),
		Size: size,
	}
	for i := 0; i < size; i++ {
		ChunksSlots.Data[i] = make(map[interface{}][]*Chunk)
	}
}

func NewCaches() caches {
	c := make(caches, SHARD_COUNT)
	for i := 0; i < SHARD_COUNT; i++ {
		c[i] = &cache{Items: make(map[interface{}]*CS)}
	}
	return c
}

func StartCleanup() {
	cfg := Config
	t := time.NewTicker(time.Minute * time.Duration(cfg.DoCleanInMinutes))
	cleaning = false

	for {
		select {
		case <-t.C:
			if !cleaning {
				go Caches.Cleanup(cfg.ExpiresInMinutes)
			} else {
				logger.Warning("cleanup() is working, may be it's too slow")
			}
		}
	}
}

func (c *caches) Push(seriesID interface{}, ts int64, value float64) error {
	shard := c.getShard(seriesID)
	existC, exist := Caches.exist(seriesID)
	if exist {
		shard.Lock()
		err := existC.Push(seriesID, ts, value)
		shard.Unlock()
		return err
	}
	newC := Caches.create(seriesID)
	shard.Lock()
	err := newC.Push(seriesID, ts, value)
	shard.Unlock()

	return err
}

func (c *caches) Get(seriesID interface{}, from, to int64) ([]Iter, error) {
	existC, exist := Caches.exist(seriesID)

	if !exist {
		return nil, fmt.Errorf("non series exist")
	}

	res := existC.Get(from, to)
	if res == nil {
		return nil, fmt.Errorf("non enough data")
	}

	return res, nil
}

func (c *caches) SetFlag(seriesID interface{}, flag uint32) error {
	existC, exist := Caches.exist(seriesID)
	if !exist {
		return fmt.Errorf("non series exist")
	}
	existC.SetFlag(flag)
	return nil
}

func (c *caches) GetFlag(seriesID interface{}) uint32 {
	existC, exist := Caches.exist(seriesID)
	if !exist {
		return 0
	}
	return existC.GetFlag()
}

func (c *caches) create(seriesID interface{}) *CS {
	atomic.AddInt64(&TotalCount, 1)
	shard := c.getShard(seriesID)
	shard.Lock()
	newC := NewChunks(Config.NumOfChunks)
	shard.Items[seriesID] = newC
	shard.Unlock()

	return newC
}

func (c *caches) exist(seriesID interface{}) (*CS, bool) {
	shard := c.getShard(seriesID)
	shard.RLock()
	existC, exist := shard.Items[seriesID]
	shard.RUnlock()

	return existC, exist
}

func (c *caches) GetCurrentChunk(seriesID interface{}) (*Chunk, bool) {
	shard := c.getShard(seriesID)
	if shard == nil {
		return nil, false
	}
	shard.RLock()
	existC, exists := shard.Items[seriesID]
	shard.RUnlock()
	if exists {
		chunk := existC.GetChunk(existC.CurrentChunkPos)
		return chunk, exists
	}
	return nil, exists
}

func (c caches) Count() int64 {
	return atomic.LoadInt64(&TotalCount)
}

func (c caches) remove(seriesID interface{}) {
	atomic.AddInt64(&TotalCount, -1)
	shard := c.getShard(seriesID)
	shard.Lock()
	delete(shard.Items, seriesID)
	shard.Unlock()
}

func (c caches) Cleanup(expiresInMinutes int) {
	now := time.Now()
	done := make(chan struct{})
	var count int64
	cleaning = true
	defer func() { cleaning = false }()

	go func() {
		wg := sync.WaitGroup{}
		wg.Add(SHARD_COUNT)

		for _, shard := range c {
			go func(shard *cache) {
				shard.RLock()
				for key, chunks := range shard.Items {
					_, lastTs := chunks.GetInfoUnsafe()
					if int64(lastTs) < now.Unix()-60*int64(expiresInMinutes) {
						atomic.AddInt64(&count, 1)
						shard.RUnlock()
						c.remove(key)
						shard.RLock()
					}
				}
				shard.RUnlock()
				wg.Done()
			}(shard)
		}
		wg.Wait()
		done <- struct{}{}
	}()

	<-done
	logger.Infof("cleanup %v Items, took %.2f ms\n", count, float64(time.Since(now).Nanoseconds())*1e-6)
}

func (c caches) getShard(key interface{}) *cache {
	switch key.(type) {
	case uint64:
		return c[int(key.(uint64)%SHARD_COUNT)]
	case string:
		return c[utils.HashKey(key.(string))%SHARD_COUNT]
	default: //不会出现此种情况
		return nil
	}
	return nil
}
