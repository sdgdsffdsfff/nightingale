package cron

import (
	"fmt"
	"math/rand"
	"time"

	"github.com/didi/nightingale/src/model"
	"github.com/didi/nightingale/src/modules/tsdb/backend/rpc"
	"github.com/didi/nightingale/src/modules/tsdb/config"

	"github.com/toolkits/pkg/logger"
	"github.com/toolkits/pkg/net/httplib"
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

type indexRes struct {
	Err string       `json:"err"`
	Dat []*model.Idx `json:"dat"`
}

func GetIndex() {
	addrs := config.Config.Api["uic"]
	perm := rand.Perm(len(addrs))
	var body indexRes
	for i := range perm {
		url := fmt.Sprintf("http://%s/v1/uic/indexs", addrs[perm[i]])
		err := httplib.Get(url).SetTimeout(time.Second).Header("x-srv-token", "uic-builtin-token").ToJSON(&body)
		if err != nil {
			logger.Warningf("curl %s fail: %v", url, err)
			continue
		}

		if body.Err != "" {
			logger.Warningf("curl %s fail: %v", url, body.Err)
			continue
		}

		activeIndexs := []string{}
		for _, index := range body.Dat {
			logger.Debug("get index:", index)
			activeIndexs = append(activeIndexs, fmt.Sprintf("%s:%s", index.IP, index.RpcPort))
		}
		config.IndexAddrs.Set(activeIndexs)
		return
	}
	return
}

func ReNewPools() {
	rpc.IndexConnPools.UpdatePools(config.IndexAddrs.Get())
}
