package cron

import (
	"fmt"
	"math/rand"
	"sync/atomic"
	"time"

	"github.com/didi/nightingale/src/model"
	"github.com/didi/nightingale/src/modules/judge/cache"
	"github.com/didi/nightingale/src/modules/judge/config"
	"github.com/didi/nightingale/src/modules/judge/logger"

	"github.com/toolkits/pkg/net/httplib"
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
	if len(opts.Addrs) == 0 {
		logger.Error(0, "empty config addr")
		return
	}

	var resp StrasResp
	perm := rand.Perm(len(opts.Addrs))
	for i := range perm {
		url := fmt.Sprintf("http://%s"+opts.PartitionApi, opts.Addrs[perm[i]], config.Identity)
		err := httplib.Get(url).SetTimeout(time.Duration(opts.Timeout) * time.Millisecond).ToJSON(&resp)

		if err != nil {
			logger.Warningf(0, "get strategy from remote failed, error:%v", err)
			continue
		}

		if resp.Err != "" {
			logger.Warningf(0, "get strategy from remote failed, error:%v", resp.Err)
			continue
		}

		if len(resp.Data) > 0 {
			break
		}
	}
	for _, stra := range resp.Data {
		atomic.AddInt64(&config.Stra, 1)
		if len(stra.Exprs) < 1 {
			logger.Warningf(stra.Id, "strategy exprs < 1 :%v", stra)
			continue
		}

		if stra.Exprs[0].Func == "nodata" {
			cache.NodataStra.Set(stra.Id, stra)
		} else {
			cache.Strategy.Set(stra.Id, stra)
		}
	}

}
