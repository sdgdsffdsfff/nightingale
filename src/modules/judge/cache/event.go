package cache

import (
	"sync"

	"github.com/didi/nightingale/src/modules/judge/config"
)

type SafeEventMap struct {
	sync.RWMutex
	M map[string]*config.Event
}

var (
	LastEvents = &SafeEventMap{M: make(map[string]*config.Event)}
)

func (this *SafeEventMap) Get(key string) (*config.Event, bool) {
	this.RLock()
	defer this.RUnlock()
	event, exists := this.M[key]
	return event, exists
}

func (this *SafeEventMap) Set(key string, event *config.Event) {
	this.Lock()
	defer this.Unlock()
	this.M[key] = event
}
