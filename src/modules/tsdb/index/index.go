package index

import (
	"fmt"
	"sync"
	"time"

	"github.com/toolkits/pkg/logger"

	"github.com/didi/nightingale/src/modules/tsdb/backend/rpc"
	"github.com/didi/nightingale/src/toolkits/report"
)

var IndexList IndexAddrs

type IndexAddrs struct {
	sync.RWMutex
	Data []string
}

func (i *IndexAddrs) Set(addrs []string) {
	i.Lock()
	defer i.Unlock()
	i.Data = addrs
}

func (i *IndexAddrs) Get() []string {
	i.RLock()
	defer i.RUnlock()
	return i.Data
}

func GetIndexLoop() {
	t1 := time.NewTicker(time.Duration(9) * time.Second)
	GetIndex()
	for {
		<-t1.C
		GetIndex()
		addrs := rpc.ReNewPools(IndexList.Get())
		RebuildAllIndex(addrs) //addrs为新增的index实例列表，重新推一遍全量索引
	}
}

func GetIndex() {
	instances := report.GetAlive("index", "monapi")
	if len(instances) < 1 {
		logger.Warningf("instances is null")
		return
	}

	activeIndexs := []string{}
	for _, instance := range instances {
		activeIndexs = append(activeIndexs, fmt.Sprintf("%s:%s", instance.Identity, instance.RPCPort))
	}

	IndexList.Set(activeIndexs)
	return
}
