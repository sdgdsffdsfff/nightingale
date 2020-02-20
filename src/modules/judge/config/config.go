package config

import (
	"bytes"
	"fmt"
	"strings"
	"sync"

	"github.com/spf13/viper"
	"github.com/toolkits/pkg/file"
	"github.com/toolkits/pkg/sys"
)

type ConfYaml struct {
	Logger           LoggerSection      `yaml:"logger"`
	Query            SeriesQuerySection `yaml:"query"`
	Publisher        PublisherSection   `yaml:"publisher"`
	Strategy         StrategySection    `yaml:"strategy"`
	Identity         IdentitySection    `yaml:"identity"`
	Http             HttpSection        `yaml:"http"`
	Rpc              RpcSection         `yaml:"rpc"`
	Report           ReportSection      `yaml:"report"`
	MinAlertInterval int64              `yaml:"minAlertInterval"`
	Remain           int                `yaml:"remain"`
}

var (
	Config *ConfYaml
	lock   = new(sync.RWMutex)
)

func Parse(conf string) error {
	bs, err := file.ReadBytes(conf)
	if err != nil {
		return fmt.Errorf("cannot read yml[%s]: %v", conf, err)
	}

	lock.Lock()
	defer lock.Unlock()

	viper.SetConfigType("yaml")
	err = viper.ReadConfig(bytes.NewBuffer(bs))
	if err != nil {
		return fmt.Errorf("cannot read yml[%s]: %v", conf, err)
	}

	viper.SetDefault("storage", map[string]interface{}{
		"queryTimeout":       1500,
		"queryConcurrency":   10,
		"queryBatch":         10,
		"queryMergeSize":     30,
		"enqueueTimeout":     200,
		"dequeueTimeout":     500,
		"queryQueueSize":     10000,
		"queuedQueryTimeout": 2200,
		"shardsetSize":       10,
		"historySize":        5,
	})

	viper.SetDefault("remain", 60)
	viper.SetDefault("minAlertInterval", 60)

	viper.SetDefault("query", map[string]interface{}{
		"maxConn":          10,
		"maxIdle":          10,
		"connTimeout":      1000,
		"callTimeout":      2000,
		"indexCallTimeout": 2000,
	})

	viper.SetDefault("publisher.redis", map[string]interface{}{
		"balance":              "round_robbin", //balance: round_robbin/random
		"maxIdle":              10,
		"bufferSize":           1024,
		"bufferEnqueueTimeout": 200,
		"connTimeout":          200,
		"readTimeout":          500,
		"writeTimeout":         500,
		"idleTimeout":          100,
	})

	viper.SetDefault("strategy", map[string]interface{}{
		"partitionApi":   "/api/mon/stras/effective?instance=%s",
		"updateInterval": 9000,
		"indexInterval":  60000,
		"timeout":        5000,
	})

	viper.SetDefault("report", map[string]interface{}{
		"interval": 4000,
	})

	err = viper.Unmarshal(&Config)
	if err != nil {
		return fmt.Errorf("cannot read yml[%s]: %v\n", conf, err)
	}
	return err
}

type PublisherSection struct {
	Type  string                `yaml:"type"`
	Redis RedisPublisherSection `yaml:"redis,omitempty"`
}

type RedisPublisherSection struct {
	Addrs                []string `yaml:"addrs"`                // 直连下游redis的地址
	Password             string   `yaml:"password"`             // 密码
	Balance              string   `yaml:"balance"`              // load balance, 负载均衡算法
	ConnTimeout          int      `yaml:"connTimeout"`          // 连接超时
	ReadTimeout          int      `yaml:"readTimeout"`          // 读超时
	WriteTimeout         int      `yaml:"writeTimeout"`         // 写超时
	MaxIdle              int      `yaml:"maxIdle"`              // idle
	IdleTimeout          int      `yaml:"idleTimeout"`          // 超时
	BufferSize           int      `yaml:"bufferSize"`           // 缓存个数
	BufferEnqueueTimeout int      `yaml:"bufferEnqueueTimeout"` // 缓存入队列超时
}

type SeriesQuerySection struct {
	Addrs            []string `json:"addrs"`            // 直连下游query的地址
	MaxConn          int      `json:"maxConn"`          //
	MaxIdle          int      `json:"maxIdle"`          //
	ConnTimeout      int      `json:"connTimeout"`      // 连接超时
	CallTimeout      int      `json:"callTimeout"`      // 请求超时
	IndexEnable      bool     `json:"indexEnable"`      //
	IndexAddrs       []string `json:"indexAddrs"`       // 直连下游index的地址
	IndexCallTimeout int      `json:"indexCallTimeout"` // 请求超时
}

type ReportSection struct {
	Addrs    []string `yaml:"addrs"`
	Interval int      `yaml:"interval"`
}

type LoggerSection struct {
	Path      string `yaml:"path"`
	Level     string `yaml:"level"`
	KeepHours int    `yaml:"keepHours"`
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

type HttpSection struct {
	Listen string `yaml:"listen"`
	Secret string `yaml:"secret"`
}

type RpcSection struct {
	Listen string `yaml:"listen"`
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
