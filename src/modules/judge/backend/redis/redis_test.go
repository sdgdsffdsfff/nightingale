package redis

import (
	"testing"

	"github.com/didi/nightingale/src/dataobj"
	"github.com/didi/nightingale/src/modules/judge/config"
	"github.com/didi/nightingale/src/modules/judge/schema/publish"

	"github.com/stretchr/testify/assert"
)

// 必须依赖下游地址做测试, 不能写单测
func Test_Redis(t *testing.T) {
	opts := publish.RedisPublisherOption{
		Addrs:                []string{"127.0.0.1:6379"},
		Balance:              "round_robbin",
		ConnTimeout:          1000,
		ReadTimeout:          1000,
		WriteTimeout:         1000,
		MaxIdle:              10,
		BufferSize:           10,
		BufferEnqueueTimeout: 100,
	}

	redisp, err := NewRedisPublisher(opts)

	assert.Nil(t, err)

	event := &config.Event{
		Sid:       1,
		EventType: "alert",
		Hashid:    uint64(111111),
		Etime:     1234556,
		History: []config.History{config.History{
			Key:    "cpu.idle/host=mock",
			Metric: "cpu.idle",
			Tags: map[string]string{
				"host": "mock",
			},
			Points: []*dataobj.RRDData{&dataobj.RRDData{
				Timestamp: 12345678,
				Value:     1.0,
			}},
		}},
		Partition: "1",
	}

	assert.Nil(t, redisp.push(event))
}
