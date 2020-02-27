package stats

import (
	"bytes"
	"encoding/json"
	"net/http"
	"sync/atomic"
	"time"

	"github.com/didi/nightingale/src/dataobj"

	"github.com/toolkits/pkg/logger"
)

var (
	PointIn          int64 = 0
	PointInErr       int64 = 0
	QueryCount       int64 = 0
	QueryUnHit       int64 = 0
	FlushRRDCount    int64 = 0
	FlushRRDErrCount int64 = 0
	PushIndex        int64 = 0
	PushIncrIndex    int64 = 0
	PushIndexErr     int64 = 0
	OldIndex         int64 = 0

	ToOldTsdb int64 = 0
	ToNewTsdb int64 = 0
)

func Statstic() {
	t1 := time.NewTicker(time.Duration(10) * time.Second)

	for {
		<-t1.C

		pointIn := atomic.SwapInt64(&PointIn, 0)
		pointInErr := atomic.SwapInt64(&PointInErr, 0)
		queryCount := atomic.SwapInt64(&QueryCount, 0)
		flushRRDCount := atomic.SwapInt64(&FlushRRDCount, 0)
		flushRRDErrCount := atomic.SwapInt64(&FlushRRDErrCount, 0)
		pushIndex := atomic.SwapInt64(&PushIndex, 0)
		pushIndexErr := atomic.SwapInt64(&PushIndexErr, 0)
		pushIncrIndex := atomic.SwapInt64(&PushIncrIndex, 0)
		oldIndex := atomic.SwapInt64(&OldIndex, 0)

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

	resp, err := http.Post("", "application/json", bf)
	if err != nil {
		logger.Error(err)
		return
	}

	defer resp.Body.Close()
	return
}
