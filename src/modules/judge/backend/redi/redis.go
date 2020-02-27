package redi

import (
	"log"
	"time"

	"github.com/garyburd/redigo/redis"
	"github.com/toolkits/pkg/logger"
)

var RedisConnPools []*redis.Pool

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

func Init(cfg RedisSection) {
	addrs := cfg.Addrs
	pass := cfg.Pass
	maxIdle := cfg.Idle
	idleTimeout := 240 * time.Second

	connTimeout := time.Duration(cfg.Timeout.Conn) * time.Millisecond
	readTimeout := time.Duration(cfg.Timeout.Read) * time.Millisecond
	writeTimeout := time.Duration(cfg.Timeout.Write) * time.Millisecond
	for _, addr := range addrs {
		redisConnPool := &redis.Pool{
			MaxIdle:     maxIdle,
			IdleTimeout: idleTimeout,
			Dial: func() (redis.Conn, error) {
				c, err := redis.Dial("tcp", addr, redis.DialConnectTimeout(connTimeout), redis.DialReadTimeout(readTimeout), redis.DialWriteTimeout(writeTimeout))
				if err != nil {
					logger.Errorf("conn redis err:%v", err)
					return nil, err
				}

				if pass != "" {
					if _, err := c.Do("AUTH", pass); err != nil {
						c.Close()
						logger.Errorf("ERR: redis auth fail:%v", err)
						return nil, err
					}
				}

				return c, err
			},
			TestOnBorrow: PingRedis,
		}
		RedisConnPools = append(RedisConnPools, redisConnPool)
	}

}

func PingRedis(c redis.Conn, t time.Time) error {
	_, err := c.Do("ping")
	if err != nil {
		log.Println("ERR: ping redis fail", err)
	}
	return err
}

func CloseRedis() {
	log.Println("INFO: closing redis...")
	for i := range RedisConnPools {
		RedisConnPools[i].Close()
	}
}
