package config

import (
	"bytes"
	"fmt"
	"sync"

	"github.com/spf13/viper"
	"github.com/toolkits/pkg/file"
)

type File struct {
	Filename string
	Body     []byte
}

type ConfYaml struct {
	Http           *HttpSection    `yaml:"http"`
	Rpc            *RpcSection     `yaml:"rpc"`
	RRD            *RRDSection     `yaml:"rrd"`
	Logger         *LoggerSection  `yaml:"logger"`
	Migrate        *MigrateSection `yaml:"migrate"`
	Index          *IndexSection   `yaml:"index"`
	Cache          *CacheSection   `yaml:"cache"`
	CallTimeout    int             `yaml:"callTimeout"`
	IOWorkerNum    int             `yaml:"ioWorkerNum"`
	FirstBytesSize int             `yaml:"firstBytesSize"`
	PushUrl        string          `yaml:"pushUrl"`
}

type CacheSection struct {
	SpanInSeconds    int `yaml:"spanInSeconds"`
	NumOfChunks      int `yaml:"numOfChunks"`
	ExpiresInMinutes int `yaml:"expiresInMinutes"`
	DoCleanInMinutes int `yaml:"doCleanInMinutes"`
	FlushDiskStepMs  int `yaml:"flushDiskStepMs"`
}

type IndexSection struct {
	ActiveDuration  int64    `yaml:"activeDuration"`  //内存索引保留时间
	RebuildInterval int64    `yaml:"rebuildInterval"` //索引重建周期
	Addrs           []string `yaml:"addrs"`
	MaxConns        int      `yaml:"maxConns"`
	MaxIdle         int      `yaml:"maxIdle"`
	ConnTimeout     int      `yaml:"connTimeout"`
	CallTimeout     int      `yaml:"callTimeout"`
}

type MigrateSection struct {
	Batch       int               `yaml:"batch"`
	Concurrency int               `yaml:"concurrency"` //number of multiple worker per node
	Enabled     bool              `yaml:"enabled"`
	Replicas    int               `yaml:"replicas"`
	OldCluster  map[string]string `yaml:"oldCluster"`
	NewCluster  map[string]string `yaml:"newCluster"`
	MaxConns    int               `yaml:"maxConns"`
	MaxIdle     int               `yaml:"maxIdle"`
	ConnTimeout int               `yaml:"connTimeout"`
	CallTimeout int               `yaml:"callTimeout"`
}

type HttpSection struct {
	Enabled bool `yaml:"enabled"`
}

type RpcSection struct {
	Enabled bool `yaml:"enabled"`
}

type RRDSection struct {
	Enabled     bool        `yaml:"enabled"`
	Storage     string      `yaml:"storage"`
	Batch       int         `yaml:"batch"`
	Concurrency int         `yaml:"concurrency"`
	Wait        int         `yaml:"wait"`
	RRA         map[int]int `yaml:"rra"`
}

type LoggerSection struct {
	Dir       string `yaml:"dir"`
	Level     string `yaml:"level"`
	KeepHours uint   `yaml:"keepHours"`
}

var (
	Config *ConfYaml
	lock   = new(sync.RWMutex)
)

func GetCfgYml() *ConfYaml {
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

	viper.SetDefault("ioWorkerNum", 64) //同时落盘的io并发个数

	viper.SetDefault("http.enabled", true)
	viper.SetDefault("rpc.enabled", true)

	viper.SetDefault("rrd", map[string]interface{}{
		"enabled":     true,
		"wait":        100, //每次从待落盘队列中间等待间隔，单位毫秒
		"batch":       100, //每次从待落盘队列中获取数据的个数
		"concurrency": 20,  //每次从待落盘队列中获取数据的个数
		"rra": map[int]int{ //假设原始点是 10s 一个点
			1:    720,   // 存储720个原始点，则 10s一个点存2h
			6:    11520, // 6点个归档为一个点，则 1min一个点存8d
			180:  1440,  // 180个点归档为一个点，则 30min一个点存1mon
			1080: 1440,  // 1080个点归档为一个点，则 6h一个点存6个月
		},
	})

	viper.SetDefault("cache", map[string]int{
		"spanInSeconds":    900, //每个数据块保存数据的时间范围，单位秒
		"numOfChunks":      16,  //使用数据块的个数，此配置表示内存会存4小时的数据
		"expiresInMinutes": 135, //内存中旧数据过期时间，单位分钟
		"doCleanInMinutes": 10,  //清理过期数据的周期，单位分钟
		"flushDiskStepMs":  1000,
	})

	viper.SetDefault("migrate", map[string]int{
		"concurrency": 2,    //从远端拉取rrd文件的并发个数
		"batch":       200,  //每次拉取文件的个数
		"replicas":    500,  //一致性has虚拟节点
		"connTimeout": 1000, //链接超时时间，单位毫秒
		"callTimeout": 3000, //访问超时时间，单位毫秒
		"maxConns":    32,   //查询和推送数据的并发个数
		"maxIdle":     32,   //建立的连接池的最大空闲数
	})

	viper.SetDefault("index", map[string]int{
		"activeDuration":  90000, //索引最大的保留时间，超过此数值，索引不会被重建，默认是1天+1小时
		"rebuildInterval": 86400, //重建索引的周期，单位为秒，默认是1天
		"maxConns":        320,   //查询和推送数据的并发个数
		"maxIdle":         320,   //建立的连接池的最大空闲数
		"connTimeout":     1000,  //链接超时时间，单位毫秒
		"callTimeout":     3000,  //访问超时时间，单位毫秒
	})

	viper.SetDefault("pushUrl", "http://127.0.0.1:2058/api/collector/push")

	err = viper.Unmarshal(&Config)
	if err != nil {
		return fmt.Errorf("Unmarshal %v", err)
	}

	return err
}

func GetInt(defaultVal, val int) int {
	if val != 0 {
		return val
	}
	return defaultVal
}

func GetString(defaultVal, val string) string {
	if val != "" {
		return val
	}
	return defaultVal
}

func GetBool(defaultVal, val bool) bool {
	if val != false {
		return val
	}
	return defaultVal
}
