package cron

import (
	"fmt"
	"time"

	"github.com/toolkits/pkg/logger"

	"github.com/didi/nightingale/src/modules/tsdb/backend/rpc"
	"github.com/didi/nightingale/src/modules/tsdb/config"
	"github.com/didi/nightingale/src/toolkits/report"
)

func GetIndexLoop() {
	t1 := time.NewTicker(time.Duration(9) * time.Second)
	GetIndex()
	for {
		<-t1.C
		GetIndex()
		ReNewPools()
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

	config.IndexAddrs.Set(activeIndexs)

	return
}

func ReNewPools() {
	rpc.IndexConnPools.UpdatePools(config.IndexAddrs.Get())
}
