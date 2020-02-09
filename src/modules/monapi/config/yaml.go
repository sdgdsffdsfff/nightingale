package config

import (
	"bytes"
	"fmt"
	"sync"

	"github.com/spf13/viper"
	"github.com/toolkits/pkg/file"
)

var (
	EventTypeMap = map[string]string{RECOVERY: "恢复", ALERT: "报警"}
)

// PortalYml -> etc/portal.yml
type PortalYml struct {
	Salt   string              `yaml:"salt"`
	Logger loggerSection       `yaml:"logger"`
	HTTP   httpSection         `yaml:"http"`
	LDAP   ldapSection         `yaml:"ldap"`
	Redis  redisSection        `yaml:"redis"`
	Proxy  proxySection        `yaml:"proxy"`
	Judges map[string]string   `yaml:"judges"`
	Alarm  alarmSection        `yaml:"alarm"`
	Sender senderSection       `yaml:"sender"`
	Link   linkSection         `yaml:"link"`
	Notify map[string][]string `yaml:"notify"`
}

type linkSection struct {
	Stra  string `yaml:"stra"`
	Event string `yaml:"event"`
	Claim string `yaml:"claim"`
}

type mergeSection struct {
	Hash     string `yaml:"hash"`
	Max      int    `yaml:"max"`
	Interval int    `yaml:"interval"`
}

type alarmSection struct {
	Enabled bool           `yaml:"enabled"`
	Queue   queueSection   `yaml:"queue"`
	Cleaner cleanerSection `yaml:"cleaner"`
	Merge   mergeSection   `yaml:"merge"`
}

type senderSection struct {
	Enabled bool `yaml:"enabled"`
}

type queueSection struct {
	High     []interface{} `yaml:"high"`
	Low      []interface{} `yaml:"low"`
	Callback string        `yaml:"callback"`
}

type cleanerSection struct {
	Days  int `yaml:"days"`
	Batch int `yaml:"batch"`
}

type redisSection struct {
	Addr    string         `yaml:"addr"`
	Pass    string         `yaml:"pass"`
	Idle    int            `yaml:"idle"`
	Timeout timeoutSection `yaml:"timeout"`
}

type timeoutSection struct {
	Conn  int `yaml:"conn"`
	Read  int `yaml:"read"`
	Write int `yaml:"write"`
}

type loggerSection struct {
	Dir       string `yaml:"dir"`
	Level     string `yaml:"level"`
	KeepHours uint   `yaml:"keepHours"`
}

type httpSection struct {
	Listen string `yaml:"listen"`
	Secret string `yaml:"secret"`
}

type ldapSection struct {
	Host       string `yaml:"host"`
	Port       int    `yaml:"port"`
	BaseDn     string `yaml:"baseDn"`
	BindUser   string `yaml:"bindUser"`
	BindPass   string `yaml:"bindPass"`
	AuthFilter string `yaml:"authFilter"`
	TLS        bool   `yaml:"tls"`
	StartTLS   bool   `yaml:"startTLS"`
}

type proxySection struct {
	Transfer string `yaml:"transfer"`
	Index    string `yaml:"index"`
}

var (
	yaml *PortalYml
	lock = new(sync.RWMutex)
)

// Get configuration file
func Get() *PortalYml {
	lock.RLock()
	defer lock.RUnlock()
	return yaml
}

// Parse configuration file
func Parse(ymlfile string) error {
	bs, err := file.ReadBytes(ymlfile)
	if err != nil {
		return fmt.Errorf("cannot read yml[%s]: %v", ymlfile, err)
	}

	viper.SetConfigType("yaml")
	err = viper.ReadConfig(bytes.NewBuffer(bs))
	if err != nil {
		return fmt.Errorf("cannot read yml[%s]: %v", ymlfile, err)
	}

	viper.SetDefault("redis.idle", 4)
	viper.SetDefault("redis.timeout", map[string]int{
		"conn":  500,
		"read":  3000,
		"write": 3000,
	})

	viper.SetDefault("alarm.queue", map[string]interface{}{
		"high":     []string{"/n9e/event/p1"},
		"low":      []string{"/n9e/event/p2", "/n9e/event/p3"},
		"callback": "/n9e/event/callback",
	})

	viper.SetDefault("alarm.cleaner", map[string]interface{}{
		"days":  366,
		"batch": 100,
	})

	viper.SetDefault("alarm.merge", map[string]interface{}{
		"hash":     "/n9e/event/merge",
		"max":      100, //merge的最大条数
		"interval": 10,  //merge等待的数据，单位秒
	})

	var c PortalYml
	err = viper.Unmarshal(&c)
	if err != nil {
		return fmt.Errorf("cannot read yml[%s]: %v", ymlfile, err)
	}

	lock.Lock()
	yaml = &c
	lock.Unlock()

	return nil
}
