package config

import "sync"

var (
	PointIn          int64 = 0
	PointInErr       int64 = 0
	QueryCount       int64 = 0
	QueryUnHit       int64 = 0
	FlushRRDCount    int64 = 0
	FlushRRDErrCount int64 = 0
	PushIndex        int64 = 0
	PushIncrIndex    int64 = 0
	PushIndexErr     int64 = 0
	OldIndex         int64 = 0

	ToOldTsdb int64 = 0
	ToNewTsdb int64 = 0

	IndexAddrs indexAddrs
)

type indexAddrs struct {
	sync.RWMutex
	Data []string
}

func (i *indexAddrs) Set(addrs []string) {
	if len(Config.Index.Addrs) != 0 {
		return
	}

	i.Lock()
	defer i.Unlock()
	i.Data = addrs
}

func (i *indexAddrs) Get() []string {
	if len(Config.Index.Addrs) != 0 {
		return Config.Index.Addrs
	}

	i.RLock()
	defer i.RUnlock()
	return i.Data
}
