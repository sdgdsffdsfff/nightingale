package cron

import (
	"bytes"
	"encoding/json"
	"net/http"
	"sync/atomic"
	"time"

	"github.com/didi/nightingale/src/dataobj"
	"github.com/didi/nightingale/src/modules/judge/config"

	"github.com/toolkits/pkg/logger"
)

func Statstic() {
	t1 := time.NewTicker(time.Duration(10) * time.Second)

	for {
		<-t1.C

		stra := atomic.SwapInt64(&config.Stra, 0)
		judgeRun := atomic.SwapInt64(&config.JudgeRun, 0)

		var items []dataobj.MetricValue
		items = append(items, NewMetricValue("stra.count", stra))
		items = append(items, NewMetricValue("judge.run", judgeRun))

		pushToMonitor(items)

	}
}

func NewMetricValue(metric string, value int64) dataobj.MetricValue {
	item := dataobj.MetricValue{
		Metric:       metric,
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

	resp, err := http.Post("http://127.0.0.1:1949/api/collector/push", "application/json", bf)
	if err != nil {
		logger.Error(err)
		return
	}

	defer resp.Body.Close()
	return
}
