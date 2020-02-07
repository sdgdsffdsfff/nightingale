package routes

import (
	"fmt"
	"os"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/didi/nightingale/src/modules/logcollector/config"
	"github.com/didi/nightingale/src/modules/logcollector/strategy"
	"github.com/didi/nightingale/src/modules/logcollector/worker"
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

func getStrategy(c *gin.Context) {
	renderData(c, strategy.GetListAll(), nil)
}

func cached(c *gin.Context) {
	renderData(c, worker.GetCachedAll(), nil)
}
