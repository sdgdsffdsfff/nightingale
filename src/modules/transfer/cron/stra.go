package cron

import (
	"fmt"
	"math/rand"
	"time"

	"github.com/toolkits/pkg/logger"
	"github.com/toolkits/pkg/net/httplib"

	"github.com/didi/nightingale/src/model"
	"github.com/didi/nightingale/src/modules/transfer/cache"
	"github.com/didi/nightingale/src/toolkits/address"
	"github.com/didi/nightingale/src/toolkits/stats"
	"github.com/didi/nightingale/src/toolkits/str"
)

type StraResp struct {
	Data []*model.Stra `json:"dat"`
	Err  string        `json:"err"`
}

func GetStrategy() {
	t1 := time.NewTicker(time.Duration(8) * time.Second)
	getStrategy()
	for {
		<-t1.C
		getStrategy()
	}
}

func getStrategy() {
	addrs := address.GetHTTPAddresses("monapi")
	if len(addrs) == 0 {
		logger.Error("empty addr")
		return
	}

	var stras StraResp
	perm := rand.Perm(len(addrs))
	for i := range perm {
		url := fmt.Sprintf("http://%s/api/portal/stras/effective?all=1", addrs[perm[i]])
		err := httplib.Get(url).SetTimeout(time.Duration(3000) * time.Millisecond).ToJSON(&stras)

		if err != nil {
			logger.Warningf("get strategy from remote failed, error:%v", err)
			continue
		}

		if stras.Err != "" {
			logger.Warningf("get strategy from remote failed, error:%v", stras.Err)
			continue
		}
	}

	straMap := make(map[string]map[string][]*model.Stra)
	for _, stra := range stras.Data {
		stats.Counter.Set("stra.count", 1)

		//var metric string
		if len(stra.Exprs) < 1 {
			continue
		}
		if stra.Exprs[0].Func == "nodata" {
			//nodata策略 不使用push模式
			continue
		}

		metric := stra.Exprs[0].Metric
		for _, endpoint := range stra.Endpoints {
			key := str.PK(metric, endpoint) //TODO get straMap key， 此处需要优化
			k1 := key[0:2]                  //为了加快查找，增加一层map，key为计算出来的hash的前2位

			if _, exists := straMap[k1]; !exists {
				straMap[k1] = make(map[string][]*model.Stra)
			}

			if _, exists := straMap[k1][key]; !exists {
				straMap[k1][key] = []*model.Stra{stra}
				stats.Counter.Set("stra.key", 1)

			} else {
				straMap[k1][key] = append(straMap[k1][key], stra)
			}
		}
	}

	cache.StraMap.ReInit(straMap)
}
