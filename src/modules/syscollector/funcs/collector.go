package funcs

import (
	"github.com/didi/nightingale/src/dataobj"
	"github.com/didi/nightingale/src/modules/syscollector/config"
)

func CollectorMetrics() []*dataobj.MetricValue {
	return []*dataobj.MetricValue{
		GaugeValue("proc.agent.alive", 1),
		GaugeValue("proc.agent.version", config.Version),
	}
}
