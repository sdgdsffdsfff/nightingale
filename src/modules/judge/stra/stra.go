package stra

import (
	"fmt"
	"math/rand"
	"time"

	"github.com/toolkits/pkg/logger"
	"github.com/toolkits/pkg/net/httplib"

	"github.com/didi/nightingale/src/model"
	"github.com/didi/nightingale/src/modules/judge/cache"
	"github.com/didi/nightingale/src/toolkits/address"
	"github.com/didi/nightingale/src/toolkits/identity"
)

type StrategySection struct {
	PartitionApi   string `yaml:"partitionApi"`
	Timeout        int    `yaml:"timeout"`
	Token          string `yaml:"token"`
	UpdateInterval int    `yaml:"updateInterval"`
	IndexInterval  int    `yaml:"indexInterval"`
	ReportInterval int    `yaml:"reportInterval"`
}

type StrasResp struct {
	Data []*model.Stra `json:"dat"`
	Err  string        `json:"err"`
}

func GetStrategy(cfg StrategySection) {
	t1 := time.NewTicker(time.Duration(cfg.UpdateInterval) * time.Millisecond)
	getStrategy(cfg)
	for {
		<-t1.C
		getStrategy(cfg)
	}
}

func getStrategy(opts StrategySection) {
	addrs := address.GetHTTPAddresses("monapi")
	if len(addrs) == 0 {
		logger.Error("empty config addr")
		return
	}

	var resp StrasResp
	perm := rand.Perm(len(addrs))
	for i := range perm {
		url := fmt.Sprintf("http://%s"+opts.PartitionApi, addrs[perm[i]], identity.Identity)
		err := httplib.Get(url).SetTimeout(time.Duration(opts.Timeout) * time.Millisecond).ToJSON(&resp)

		if err != nil {
			logger.Warningf("get strategy from remote failed, error:%v", err)
			continue
		}

		if resp.Err != "" {
			logger.Warningf("get strategy from remote failed, error:%v", resp.Err)
			continue
		}

		if len(resp.Data) > 0 {
			break
		}
	}
	for _, stra := range resp.Data {
		if len(stra.Exprs) < 1 {
			logger.Warningf("strategy:%v exprs < 1", stra)
			continue
		}

		if stra.Exprs[0].Func == "nodata" {
			cache.NodataStra.Set(stra.Id, stra)
		} else {
			cache.Strategy.Set(stra.Id, stra)
		}
	}

	cache.Strategy.Clean()
}
