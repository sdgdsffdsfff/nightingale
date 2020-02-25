package cache

import (
	"sync"

	"github.com/didi/nightingale/src/dataobj"

	"github.com/toolkits/pkg/logger"
)

type MetricIndex struct {
	Metric     string        `json:"metric"`
	Step       int           `json:"step"`
	DsType     string        `json:"dstype"`
	TagkvMap   *TagkvIndex   `json:"tags"`
	CounterMap *CounterTsMap `json:"counters"`
}

func NewMetricIndex(item dataobj.IndexModel, counter string, now int64) *MetricIndex {
	metricIndex := &MetricIndex{
		Metric:     item.Metric,
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

type MetricIndexMap struct {
	sync.RWMutex
	Data map[string]*MetricIndex
}

func (m *MetricIndexMap) Clean(now, timeDuration int64, endpoint string) {
	m.Lock()
	defer m.Unlock()
	for metric, metricIndex := range m.Data {
		//清理tagkv
		metricIndex.TagkvMap.Clean(now, timeDuration)

		//清理counter
		metricIndex.CounterMap.Clean(now, timeDuration, endpoint, metric)

		if metricIndex.TagkvMap.Len() == 0 {
			delete(m.Data, metric)
			logger.Errorf("[clean index metric] endpoint:%s metric:%s now:%d time duration:%d", endpoint, metric, now, timeDuration)
		}
	}
}

func (m *MetricIndexMap) CleanMetric(metric string) {
	m.Lock()
	defer m.Unlock()
	delete(m.Data, metric)
	return
}

func (m *MetricIndexMap) Len() int {
	m.RLock()
	defer m.RUnlock()

	return len(m.Data)
}

func (m *MetricIndexMap) GetMetricIndex(metric string) (*MetricIndex, bool) {
	m.RLock()
	defer m.RUnlock()

	metricIndex, exists := m.Data[metric]
	return metricIndex, exists
}

func (m *MetricIndexMap) SetMetricIndex(metric string, metricIndex *MetricIndex) {
	m.Lock()
	defer m.Unlock()
	m.Data[metric] = metricIndex
}

func (m *MetricIndexMap) GetMetrics() []string {
	m.RLock()
	defer m.RUnlock()
	var metrics []string
	for k, _ := range m.Data {
		metrics = append(metrics, k)
	}
	return metrics
}
