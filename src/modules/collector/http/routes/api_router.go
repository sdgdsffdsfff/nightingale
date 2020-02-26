package routes

import (
	"fmt"
	"os"
	"strconv"

	"github.com/didi/nightingale/src/dataobj"
	"github.com/didi/nightingale/src/modules/collector/config"
	"github.com/didi/nightingale/src/modules/collector/log/strategy"
	"github.com/didi/nightingale/src/modules/collector/log/worker"
	"github.com/didi/nightingale/src/modules/collector/stra"
	"github.com/didi/nightingale/src/modules/collector/sys/funcs"
	"github.com/didi/nightingale/src/toolkits/identity"

	"github.com/gin-gonic/gin"
	"github.com/toolkits/pkg/errors"
	"github.com/toolkits/pkg/logger"
)

func ping(c *gin.Context) {
	c.String(200, "pong")
}

func version(c *gin.Context) {
	c.String(200, strconv.Itoa(config.Version))
}

func addr(c *gin.Context) {
	c.String(200, c.Request.RemoteAddr)
}

func pid(c *gin.Context) {
	c.String(200, fmt.Sprintf("%d", os.Getpid()))
}

func pushData(c *gin.Context) {
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
		if v.Endpoint == "" {
			v.Endpoint = identity.Identity
		}
		err := v.CheckValidity()
		if err != nil {
			msg += fmt.Sprintf("recv metric %v err:%v\n", v, err)
			logger.Warningf(msg)
			continue
		}
		metricValues = append(metricValues, v)
	}

	funcs.Push(metricValues)

	if msg != "" {
		renderMessage(c, msg)
		return
	}

	renderData(c, "ok", nil)
	return
}

func getStrategy(c *gin.Context) {
	var resp []interface{}

	port := stra.GetPortCollects()
	for _, stra := range port {
		resp = append(resp, stra)
	}

	proc := stra.GetProcCollects()
	for _, stra := range proc {
		resp = append(resp, stra)
	}

	logStras := strategy.GetListAll()
	for _, stra := range logStras {
		resp = append(resp, stra)
	}

	renderData(c, resp, nil)
}

func getLogCached(c *gin.Context) {
	renderData(c, worker.GetCachedAll(), nil)
}
