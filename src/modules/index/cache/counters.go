package cache

import (
	"strings"
	"sync"
	"sync/atomic"

	"github.com/didi/nightingale/src/modules/index/config"

	"github.com/toolkits/pkg/logger"
)

type CountersStruct struct { // ns/metric -> counter
	sync.RWMutex
	Counters map[string]*CounterStruct `json:"counters"`
}

func NewCountersStruct() *CountersStruct {
	return &CountersStruct{Counters: make(map[string]*CounterStruct, 0)}
}

func (c *CountersStruct) Update(counter string, ts int64, step int64, dsType string) {
	c.Lock()
	if _, ok := c.Counters[counter]; !ok {
		//gCntInc()
		c.Counters[counter] = NewCounterStruct(ts, step, dsType)
	} else {
		c.Counters[counter].Update(ts, step, dsType)
	}
	c.Unlock()
}

func (c *CountersStruct) Clean(now, timeDuration int64, endpoint, metric string) {
	c.Lock()
	defer c.Unlock()
	for k, counter := range c.Counters {
		if now-counter.GetUpdate() > timeDuration {
			delete(c.Counters, k)
			atomic.AddInt64(&config.IndexClean, 1)
			logger.Debugf("clean index endpoint:%s metric:%s counter:%s", endpoint, metric, k)
		}
	}
}

func (c *CountersStruct) CleanEndpoint(endpoint string) {
	c.Lock()
	defer c.Unlock()
	for k, _ := range c.Counters {
		if strings.Contains(k, endpoint) {
			delete(c.Counters, k)
		}
	}
}

func (c *CountersStruct) GetCounters() []string {
	c.RLock()
	defer c.RUnlock()
	counters := []string{}
	for counter, _ := range c.Counters {
		counters = append(counters, counter)
	}
	return counters
}
