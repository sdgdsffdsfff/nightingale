package config

import (
	"fmt"
	"strings"
)

func GetPort(l string) (string, error) {
	tmp := strings.Split(l, ":")
	if len(tmp) < 2 {
		return "", fmt.Errorf("port error:%s", l)
	}
	p := tmp[1]
	return p, nil
}
