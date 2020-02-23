package config

import (
	"fmt"
	"os"
	"strings"

	"github.com/toolkits/pkg/logger"
	"github.com/toolkits/pkg/sys"
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

func GetIdentity() (string, error) {
	if Config.Identity.Specify != "" {
		return Config.Identity.Specify, nil
	}

	return sys.CmdOutTrim("bash", "-c", Config.Identity.Shell)
}

func GetPort(l string) (string, error) {
	tmp := strings.Split(l, ":")
	if len(tmp) < 2 {
		return "", fmt.Errorf("port error:%s", l)
	}
	p := tmp[1]
	return p, nil
}
