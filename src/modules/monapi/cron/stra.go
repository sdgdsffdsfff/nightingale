package cron

import (
	"fmt"
	"time"

	"github.com/toolkits/pkg/logger"

	"github.com/didi/nightingale/src/model"
	"github.com/didi/nightingale/src/modules/monapi/mcache"
)

func SyncStraLoop() {
	duration := time.Second * time.Duration(9)
	for {
		time.Sleep(duration)
		logger.Debug("sync stra begin")
		err := SyncStra()
		if err != nil {
			logger.Error("sync stra fail: ", err)
		} else {
			logger.Debug("sync stra succ")
		}
	}
}

func SyncStra() error {
	list, err := model.StrasAll()
	if err != nil {
		return fmt.Errorf("model.StrasAll fail: %v", err)
	}

	smap := make(map[int64]*model.Stra)
	size := len(list)
	for i := 0; i < size; i++ {
		smap[list[i].Id] = list[i]
	}

	mcache.StraCache.SetAll(smap)
	return nil
}
