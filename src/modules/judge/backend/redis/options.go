package redis

import (
	"time"

	"github.com/didi/nightingale/src/modules/judge/config"
)

var (
	timeoutUnit = time.Millisecond * 1
	Pub         EventPublisher // 全局 唯一publisher对象
)

func Duration(n int) time.Duration {
	return time.Duration(n) * timeoutUnit
}

type EventPublisher interface {
	Publish(event *config.Event) error
	Close() // 如果publisher带有缓冲区, 执行Close() 代表 关闭写入, 尽可能写出
}
