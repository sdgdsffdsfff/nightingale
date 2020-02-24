package cron

import (
	"bytes"
	"encoding/json"
	"net/http"
	"sync/atomic"
	"time"

	"github.com/didi/nightingale/src/dataobj"
	"github.com/didi/nightingale/src/modules/tsdb/config"

	"github.com/toolkits/pkg/logger"
)

func Statstic() {
	t1 := time.NewTicker(time.Duration(10) * time.Second)

	for {
		<-t1.C

		pointIn := atomic.SwapInt64(&config.PointIn, 0)
		pointInErr := atomic.SwapInt64(&config.PointInErr, 0)
		queryCount := atomic.SwapInt64(&config.QueryCount, 0)
		flushRRDCount := atomic.SwapInt64(&config.FlushRRDCount, 0)
		flushRRDErrCount := atomic.SwapInt64(&config.FlushRRDErrCount, 0)
		pushIndex := atomic.SwapInt64(&config.PushIndex, 0)
		pushIndexErr := atomic.SwapInt64(&config.PushIndexErr, 0)
		pushIncrIndex := atomic.SwapInt64(&config.PushIncrIndex, 0)
		oldIndex := atomic.SwapInt64(&config.OldIndex, 0)

		var items []dataobj.MetricValue
		items = append(items, NewMetricValue("n9e.tsdb.point_in", pointIn))
		items = append(items, NewMetricValue("n9e.tsdb.point_in_err", pointInErr))
		items = append(items, NewMetricValue("n9e.tsdb.query_count", queryCount))
		items = append(items, NewMetricValue("n9e.tsdb.flush_rrd_count", flushRRDCount))
		items = append(items, NewMetricValue("n9e.tsdb.flush_rrd_err_count", flushRRDErrCount))
		items = append(items, NewMetricValue("n9e.tsdb.push_index", pushIndex))
		items = append(items, NewMetricValue("n9e.tsdb.push_index_err", pushIndexErr))
		items = append(items, NewMetricValue("n9e.tsdb.push_index_incr", pushIncrIndex))
		items = append(items, NewMetricValue("n9e.tsdb.old_index", oldIndex))

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

	resp, err := http.Post(config.GetCfgYml().PushUrl, "application/json", bf)
	if err != nil {
		logger.Error(err)
		return
	}

	defer resp.Body.Close()
	return
}
