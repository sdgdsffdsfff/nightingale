package config

import (
	"log"

	"github.com/didi/nightingale/src/modules/judge/logger"
)

func InitLogger() {
	backend, err := logger.NewFileBackend(Config.Logger.Path)
	if err != nil {
		log.Fatalln("[F] InitLog failed:", err)
	}

	// 初始化日志库
	logger.SetLogging(Config.Logger.Level, backend)
	backend.SetRotateByHour(true)
	backend.SetKeepHours(uint(Config.Logger.KeepHours))
}
