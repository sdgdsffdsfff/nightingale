package cache

import (
	"sync"

	"github.com/toolkits/pkg/logger"
)

type MetricIndexMap struct {
	sync.RWMutex
	Data map[string]*MetricIndex
}

func (m *MetricIndexMap) Clean(now, timeDuration int64, endpoint string) {
	m.Lock()
	defer m.Unlock()
	for metric, metricIndex := range m.Data {
		if now-metricIndex.Updated > timeDuration {
			//清理metric
			delete(m.Data, metric)
			logger.Errorf("[clean index metric] endpoint:%s metric:%s now:%d time duration:%d updated:%d", endpoint, metric, now, timeDuration, metricIndex.Updated)
		} else {
			//清理tagkv
			metricIndex.TagkvMap.Clean(now, timeDuration)

			//清理counter
			metricIndex.CounterMap.Clean(now, timeDuration, endpoint, metric)
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

func (m *MetricIndexMap) GetStepAndDstype(metric string) (int, string, bool) {
	m.RLock()
	defer m.RUnlock()
	metricIndex, exists := m.Data[metric]
	if !exists {
		return 0, "", exists
	}
	return metricIndex.Step, metricIndex.DsType, exists
}

func (m *MetricIndexMap) GetMetricIndexCounters(metric string) (*CounterTsMap, bool) {
	m.RLock()
	defer m.RUnlock()
	metricIndex, exists := m.Data[metric]
	if !exists {
		return nil, exists
	}
	return metricIndex.CounterMap, exists
}

func (m *MetricIndexMap) GetMetricIndexTagkvMap(metric string) (*TagkvIndex, bool) {
	m.RLock()
	defer m.RUnlock()

	metricIndex, exists := m.Data[metric]
	if !exists {
		return nil, exists
	}

	return metricIndex.TagkvMap, exists
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
