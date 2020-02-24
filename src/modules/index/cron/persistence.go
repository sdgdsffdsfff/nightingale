package cron

import (
	"time"

	"github.com/didi/nightingale/src/modules/index/cache"
	. "github.com/didi/nightingale/src/modules/index/config"

	"github.com/toolkits/pkg/logger"
)

func StartPersist() {
	t1 := time.NewTicker(time.Duration(Config.PersistInterval) * time.Second)
	for {
		<-t1.C

		err := cache.IndexDB.Persist("normal")
		if err != nil {
			logger.Error("Persist err:", err)
		}
		//logger.Infof("clean %+v, took %.2f ms\n", cleanRet, float64(time.Since(start).Nanoseconds())*1e-6)
	}
}
