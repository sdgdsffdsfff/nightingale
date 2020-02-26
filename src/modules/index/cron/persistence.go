package cron

import (
	"time"

	"github.com/didi/nightingale/src/modules/index/cache"

	"github.com/toolkits/pkg/logger"
)

func StartPersist(interval int, dir string) {
	t1 := time.NewTicker(time.Duration(interval) * time.Second)
	for {
		<-t1.C

		err := cache.Persist("normal", dir)
		if err != nil {
			logger.Error("Persist err:", err)
		}
		//logger.Infof("clean %+v, took %.2f ms\n", cleanRet, float64(time.Since(start).Nanoseconds())*1e-6)
	}
}
