package cache

import "github.com/didi/nightingale/src/dataobj"

//Metric
type MetricIndex struct {
	Metric  string `json:"metric"`
	Updated int64  `json:"updated"`
	Step    int    `json:"step"`
	DsType  string `json:"dstype"`

	TagkvMap   *TagkvIndex   `json:"ns_metric_tagks"`
	CounterMap *CounterTsMap `json:"ns_metric_counters"`
}

func NewMetricIndex(item dataobj.IndexModel, counter string, now int64) *MetricIndex {
	metricIndex := &MetricIndex{
		Metric:     item.Metric,
		Updated:    now,
		Step:       item.Step,
		DsType:     item.DsType,
		TagkvMap:   NewTagkvIndex(),
		CounterMap: NewCounterTsMap(),
	}

	metricIndex.TagkvMap = NewTagkvIndex()
	for k, v := range item.Tags {
		metricIndex.TagkvMap.Set(k, v, now)
	}

	metricIndex.CounterMap.Set(counter, now)

	return metricIndex
}
