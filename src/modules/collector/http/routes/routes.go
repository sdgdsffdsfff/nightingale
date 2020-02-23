package routes

import (
	"github.com/didi/nightingale/src/modules/collector/config"

	"github.com/gin-contrib/pprof"
	"github.com/gin-gonic/gin"
)

// Config routes
func Config(r *gin.Engine) {
	sys := r.Group("/api/collector")
	{
		sys.GET("/ping", ping)
		sys.GET("/version", version)
		sys.GET("/pid", pid)
		sys.GET("/addr", addr)

		sys.GET("/stra", getStrategy)
		sys.GET("/cached", getLogCached)
		sys.POST("/push", pushData)
	}

	if config.Get().Logger.Level == "DEBUG" {
		pprof.Register(r, "/api/collector/debug/pprof")
	}
}
