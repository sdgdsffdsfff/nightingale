package routes

import (
	"fmt"

	"github.com/didi/nightingale/src/dataobj"
	"github.com/didi/nightingale/src/modules/transfer/backend"
	. "github.com/didi/nightingale/src/modules/transfer/config"

	"github.com/gin-gonic/gin"
	"github.com/toolkits/pkg/errors"
	"github.com/toolkits/pkg/logger"
)

func PushData(c *gin.Context) {
	if c.Request.ContentLength == 0 {
		renderMessage(c, "blank body")
		return
	}

	recvMetricValues := []*dataobj.MetricValue{}
	metricValues := []*dataobj.MetricValue{}
	errors.Dangerous(c.ShouldBind(&recvMetricValues))

	var msg string
	for _, v := range recvMetricValues {
		logger.Debug("->recv: ", v)
		err := v.CheckValidity()
		if err != nil {
			msg += fmt.Sprintf("recv metric %v err:%v\n", v, err)
			logger.Warningf(msg)
			continue
		}
		metricValues = append(metricValues, v)
	}

	if Config.Tsdb.Enabled {
		backend.Push2TsdbSendQueue(metricValues)
	}

	if Config.Judge.Enabled {
		backend.Push2JudgeSendQueue(metricValues)
	}

	if msg != "" {
		renderMessage(c, msg)
		return
	}

	renderData(c, "ok", nil)
	return
}
