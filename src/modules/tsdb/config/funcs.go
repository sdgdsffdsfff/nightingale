package config

import (
	"fmt"
	"os"

	"github.com/toolkits/pkg/logger"
)

func InitLogger() {
	c := Config.Logger

	lb, err := logger.NewFileBackend(c.Dir)
	if err != nil {
		fmt.Println("cannot init logger:", err)
		os.Exit(1)
	}

	lb.SetRotateByHour(true)
	lb.SetKeepHours(c.KeepHours)

	logger.SetLogging(c.Level, lb)
}
