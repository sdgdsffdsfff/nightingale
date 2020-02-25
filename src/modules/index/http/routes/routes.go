package routes

import (
	"github.com/didi/nightingale/src/modules/index/config"

	"github.com/gin-contrib/pprof"
	"github.com/gin-gonic/gin"
)

// Config routes
func Config(r *gin.Engine) {
	sys := r.Group("/api/index")
	{
		sys.GET("/ping", ping)
		sys.GET("/version", version)
		sys.GET("/pid", pid)
		sys.GET("/addr", addr)

		sys.POST("/metrics", GetMetrics)
		sys.DELETE("/metrics", DelMetrics)
		sys.POST("/tagkv", GetTagPairs)
		sys.POST("/counter/fullmatch", GetIndexByFullTags)
		sys.POST("/counter/clude", GetIndexByClude)
		sys.POST("/dump", DumpIndex)
		sys.GET("/dumpfile", DumpFile)
	}

	if config.GetCfgYml().Logger.Level == "DEBUG" {
		pprof.Register(r, "/api/index/debug/pprof")
	}
}
