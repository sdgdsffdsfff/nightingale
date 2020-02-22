package config

import (
	"bytes"
	"fmt"
	"sync"

	"github.com/spf13/viper"
	"github.com/toolkits/pkg/file"
)

type ConfYaml struct {
	Debug            bool                `yaml:"debug"`
	Reportor         bool                `yaml:"reportor"`
	NtpServers       []string            `yaml:"ntpServers"`
	PortPath         string              `yaml:"portPath"`
	ProcPath         string              `yaml:"procPath"`
	LogPath          string              `yaml:"logPath"`
	Plugin           string              `yaml:"plugin"`
	CollectAddr      string              `yaml:"collectAddr"`
	MaxCPURate       float64             `yaml:"max_cpu_rate"`
	MaxMemRate       float64             `yaml:"max_mem_rate"`
	Endpoint         EndpointSection     `yaml:"endpoint"`
	Logger           LoggerSection       `yaml:"logger"`
	Transfer         TransferSection     `yaml:"transfer"`
	Collector        CollectorSection    `yaml:"collector"`
	Worker           WorkerSection       `yaml:"worker"`
	IgnoreMetrics    []string            `yaml:"ignoreMetrics"`
	IgnoreMetricsMap map[string]struct{} `yaml:"-"`
}

type WorkerSection struct {
	WorkerNum    int `yaml:"workerNum"`
	QueueSize    int `yaml:"queueSize"`
	PushInterval int `yaml:"pushInterval"`
	WaitPush     int `yaml:"waitPush"`
}

type EndpointSection struct {
	Specify string `yaml:"specify"`
	Shell   string `yaml:"shell"`
}

type TransferSection struct {
	Enabled  string `yaml:"enabled"`
	Interval int    `yaml:"interval"`
	Timeout  int    `yaml:"timeout"`
}

type LoggerSection struct {
	Dir       string `yaml:"dir"`
	Level     string `yaml:"level"`
	KeepHours uint   `yaml:"keepHours"`
}

type CollectorSection struct {
	IfacePrefix       []string `yaml:"ifacePrefix"`
	MountPoint        []string `yaml:"mountPoint"`
	MountIgnorePrefix []string `yaml:"mountIgnorePrefix"`
	SyncCollect       bool     `yaml:"syncCollect"`
	Addrs             []string `yaml:"addrs"`
	Timeout           int      `yaml:"timeout"`
	Interval          int      `yaml:"interval"`
}

var (
	Config   *ConfYaml
	lock     = new(sync.RWMutex)
	Endpoint string
	Cwd      string
)

// Get configuration file
func Get() *ConfYaml {
	lock.RLock()
	defer lock.RUnlock()
	return Config
}

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

	viper.SetDefault("plugin", "/home/n9e/plugin")     //插件采集配置文件目录
	viper.SetDefault("portPath", "/home/n9e/etc/port") //端口采集配置文件目录
	viper.SetDefault("procPath", "/home/n9e/etc/proc") //进程采集配置文件目录
	viper.SetDefault("logPath", "/home/n9e/etc/log")   //进程采集配置文件目录
	viper.SetDefault("reportor", false)                //是否启用reportor采集CPU、内存等信息上报，executor和collector都具备此能力，任开一个即可

	viper.SetDefault("worker", map[string]interface{}{
		"workerNum":    10,
		"queueSize":    1024000,
		"pushInterval": 5,
		"waitPush":     0,
	})

	viper.SetDefault("transfer", map[string]interface{}{
		"enabled":  true,
		"timeout":  1000,
		"interval": 20, //基础指标上报周期
	})

	viper.SetDefault("collector", map[string]interface{}{
		"timeout":  1000, //请求超时时间
		"interval": 10,   //采集策略更新时间
	})

	err = viper.Unmarshal(&Config)
	if err != nil {
		return fmt.Errorf("Unmarshal %v", err)
	}

	l := len(Config.IgnoreMetrics)
	m := make(map[string]struct{}, l)
	for i := 0; i < l; i++ {
		m[Config.IgnoreMetrics[i]] = struct{}{}
	}

	Config.IgnoreMetricsMap = m

	return nil
}
