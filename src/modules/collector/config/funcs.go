package config

import (
	"fmt"
	"os"

	"github.com/toolkits/pkg/logger"
	"github.com/toolkits/pkg/sys"
)

func GetEndpoint() (string, error) {
	if Config.Endpoint.Specify != "" {
		return Config.Endpoint.Specify, nil
	}

	return sys.CmdOutTrim("bash", "-c", Config.Endpoint.Shell)
}

// InitLogger init logger toolkits
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
