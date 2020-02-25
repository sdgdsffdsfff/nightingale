package cache

import (
	"sync"
	"sync/atomic"

	"github.com/didi/nightingale/src/modules/index/config"

	"github.com/toolkits/pkg/logger"
)

type CounterTsMap struct {
	sync.RWMutex
	M map[string]int64 `json:"counters"` // map[counter]ts
}

func NewCounterTsMap() *CounterTsMap {
	return &CounterTsMap{M: make(map[string]int64, 0)}
}

func (c *CounterTsMap) Set(counter string, ts int64) {
	c.Lock()
	defer c.Unlock()
	c.M[counter] = ts
}

func (c *CounterTsMap) Clean(now, timeDuration int64, endpoint, metric string) {
	c.Lock()
	defer c.Unlock()
	for counter, ts := range c.M {
		if now-ts > timeDuration {
			delete(c.M, counter)
			atomic.AddInt64(&config.IndexClean, 1)
			logger.Debugf("clean index endpoint:%s metric:%s counter:%s", endpoint, metric, counter)
		}
	}
}

func (c *CounterTsMap) GetCounters() map[string]int64 {
	c.RLock()
	defer c.RUnlock()
	return c.M
}
