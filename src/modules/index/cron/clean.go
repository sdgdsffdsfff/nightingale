package cron

import (
	"time"

	"github.com/didi/nightingale/src/modules/index/cache"

	"github.com/toolkits/pkg/logger"
)

func StartCleaner(interval int, cacheDuration int) {
	t1 := time.NewTicker(time.Duration(interval) * time.Second)
	for {
		<-t1.C

		start := time.Now()
		cache.IndexDB.Clean(int64(cacheDuration))
		logger.Infof("clean took %.2f ms\n", float64(time.Since(start).Nanoseconds())*1e-6)
	}
}
