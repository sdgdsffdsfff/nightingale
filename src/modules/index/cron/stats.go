package cron

import (
	"bytes"
	"encoding/json"
	"net/http"
	"sync/atomic"
	"time"

	"github.com/didi/nightingale/src/dataobj"
	"github.com/didi/nightingale/src/modules/index/config"

	"github.com/toolkits/pkg/logger"
)

func Statstic() {
	t1 := time.NewTicker(time.Duration(10) * time.Second)
	for {
		<-t1.C
		var items []dataobj.MetricValue
		indexIn := atomic.SwapInt64(&config.IndexIn, 0)
		incrIndexIn := atomic.SwapInt64(&config.IncrIndexIn, 0)
		indexErr := atomic.SwapInt64(&config.IndexInErr, 0)
		indexClean := atomic.SwapInt64(&config.IndexClean, 0)

		items = append(items, NewMetricValue("n9e.index.index_in", indexIn))
		items = append(items, NewMetricValue("n9e.index.incr_index_in", incrIndexIn))
		items = append(items, NewMetricValue("n9e.index.index_err", indexErr))
		items = append(items, NewMetricValue("n9e.index.index_clean", indexClean))
		pushToMonitor(items)
	}
}

func NewMetricValue(metric string, value int64) dataobj.MetricValue {
	item := dataobj.MetricValue{
		Metric:       metric,
		Endpoint:     config.Identity,
		Timestamp:    time.Now().Unix(),
		ValueUntyped: value,
		CounterType:  "GAUGE",
		Step:         10,
	}
	return item
}

func pushToMonitor(items []dataobj.MetricValue) {
	bs, err := json.Marshal(items)
	if err != nil {
		logger.Error(err)
		return
	}

	bf := bytes.NewBuffer(bs)

	resp, err := http.Post(config.GetCfgYml().PushUrl, "application/json", bf)
	if err != nil {
		logger.Error(err)
		return
	}

	defer resp.Body.Close()
	return
}
