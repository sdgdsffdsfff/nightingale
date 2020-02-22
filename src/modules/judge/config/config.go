package config

import (
	"bytes"
	"fmt"
	"strings"

	"github.com/spf13/viper"
	"github.com/toolkits/pkg/file"
	"github.com/toolkits/pkg/sys"
)

type ConfYaml struct {
	Logger   LoggerSection      `yaml:"logger"`
	Query    SeriesQuerySection `yaml:"query"`
	Redis    RedisSection       `yaml:"redis"`
	Strategy StrategySection    `yaml:"strategy"`
	Identity IdentitySection    `yaml:"identity"`
	Report   ReportSection      `yaml:"report"`
	PushUrl  string             `yaml:"pushUrl"`
}

var (
	Config *ConfYaml
)

func Parse(conf string) error {
	bs, err := file.ReadBytes(conf)
	if err != nil {
		return fmt.Errorf("cannot read yml[%s]: %v", conf, err)
	}

	viper.SetConfigType("yaml")
	err = viper.ReadConfig(bytes.NewBuffer(bs))
	if err != nil {
		return fmt.Errorf("cannot read yml[%s]: %v", conf, err)
	}

	viper.SetDefault("query", map[string]interface{}{
		"maxConn":          10,
		"maxIdle":          10,
		"connTimeout":      1000,
		"callTimeout":      2000,
		"indexCallTimeout": 2000,
	})

	viper.SetDefault("redis.idle", 5)
	viper.SetDefault("redis.timeout", map[string]int{
		"conn":  500,
		"read":  3000,
		"write": 3000,
	})

	viper.SetDefault("strategy", map[string]interface{}{
		"partitionApi":   "/api/portal/stras/effective?instance=%s",
		"updateInterval": 9000,
		"indexInterval":  60000,
		"timeout":        5000,
	})

	viper.SetDefault("report", map[string]interface{}{
		"interval": 4000,
	})

	viper.SetDefault("pushUrl", "http://127.0.0.1:2058/api/collector/push")

	err = viper.Unmarshal(&Config)
	if err != nil {
		return fmt.Errorf("cannot read yml[%s]: %v\n", conf, err)
	}
	return err
}

type RedisSection struct {
	Addrs   []string       `yaml:"addrs"`
	Pass    string         `yaml:"pass"`
	Idle    int            `yaml:"idle"`
	Timeout TimeoutSection `yaml:"timeout"`
}

type TimeoutSection struct {
	Conn  int `yaml:"conn"`
	Read  int `yaml:"read"`
	Write int `yaml:"write"`
}

type SeriesQuerySection struct {
	Addrs            []string `json:"addrs"`            // 直连下游query的地址
	MaxConn          int      `json:"maxConn"`          //
	MaxIdle          int      `json:"maxIdle"`          //
	ConnTimeout      int      `json:"connTimeout"`      // 连接超时
	CallTimeout      int      `json:"callTimeout"`      // 请求超时
	IndexAddrs       []string `json:"indexAddrs"`       // 直连下游index的地址
	IndexCallTimeout int      `json:"indexCallTimeout"` // 请求超时
}

type ReportSection struct {
	Addrs    []string `yaml:"addrs"`
	Interval int      `yaml:"interval"`
}

type LoggerSection struct {
	Dir       string `yaml:"dir"`
	Level     string `yaml:"level"`
	KeepHours uint   `yaml:"keepHours"`
}

type StrategySection struct {
	Addrs          []string `yaml:"addrs"` // 形如 http://IP:port/url
	PartitionApi   string   `yaml:"partitionApi"`
	Timeout        int      `yaml:"timeout"`
	Token          string   `yaml:"token"`
	UpdateInterval int      `yaml:"updateInterval"`
	IndexInterval  int      `yaml:"indexInterval"`
	ReportInterval int      `yaml:"reportInterval"`
}

type IdentitySection struct {
	Specify string `yaml:"specify"`
	Shell   string `yaml:"shell"`
}

func GetIdentity(opts IdentitySection) (string, error) {
	if opts.Specify != "" {
		return opts.Specify, nil
	}

	return sys.CmdOutTrim("bash", "-c", opts.Shell)
}

func GetPort(l string) (string, error) {
	tmp := strings.Split(l, ":")
	if len(tmp) < 2 {
		return "", fmt.Errorf("port error:%s", l)
	}
	p := tmp[1]
	return p, nil
}
