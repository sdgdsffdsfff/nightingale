package cache

import (
	"sync"

	"github.com/didi/nightingale/src/model"
)

type SafeStraMap struct {
	sync.RWMutex
	M map[string]map[string][]*model.Stra
}

var (
	StraMap = &SafeStraMap{M: make(map[string]map[string][]*model.Stra)}
)

func (this *SafeStraMap) ReInit(m map[string]map[string][]*model.Stra) {
	this.Lock()
	defer this.Unlock()
	this.M = m
}

func (this *SafeStraMap) GetByKey(key string) []*model.Stra {
	this.RLock()
	defer this.RUnlock()
	m, exists := this.M[key[0:2]]
	if !exists {
		return []*model.Stra{}
	}

	return m[key]
}
