package cron

import (
	"fmt"
	"math/rand"
	"sync/atomic"
	"time"

	"github.com/toolkits/pkg/logger"
	"github.com/toolkits/pkg/net/httplib"

	"github.com/didi/nightingale/src/model"
	"github.com/didi/nightingale/src/modules/judge/cache"
	"github.com/didi/nightingale/src/modules/judge/config"
	"github.com/didi/nightingale/src/toolkits/address"
	"github.com/didi/nightingale/src/toolkits/identity"
	"github.com/didi/nightingale/src/toolkits/report"
)

type StrasResp struct {
	Data []*model.Stra `json:"dat"`
	Err  string        `json:"err"`
}

func GetStrategy() {
	t1 := time.NewTicker(time.Duration(config.Config.Strategy.UpdateInterval) * time.Millisecond)
	getStrategy(config.Config.Strategy)
	for {
		<-t1.C
		getStrategy(config.Config.Strategy)
	}
}

func getStrategy(opts config.StrategySection) {
	addrs := address.GetHTTPAddresses("monapi")
	if len(addrs) == 0 {
		logger.Error("empty config addr")
		return
	}

	var resp StrasResp
	perm := rand.Perm(len(addrs))
	for i := range perm {
		url := fmt.Sprintf("http://%s:%s"+opts.PartitionApi, addrs[perm[i]], identity.Identity, report.Config.RPCPort)
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
		atomic.AddInt64(&config.Stra, 1)
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
