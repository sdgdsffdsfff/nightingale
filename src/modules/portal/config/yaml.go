package config

import (
	"bytes"
	"fmt"
	"sync"

	"github.com/spf13/viper"
	"github.com/toolkits/pkg/file"
)

// PortalYml -> etc/portal.yml
type PortalYml struct {
	Salt   string            `yaml:"salt"`
	Logger loggerSection     `yaml:"logger"`
	HTTP   httpSection       `yaml:"http"`
	LDAP   ldapSection       `yaml:"ldap"`
	Redis  redisSection      `yaml:"redis"`
	Proxy  proxySection      `yaml:"proxy"`
	Judges map[string]string `yaml:"judges"`
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
