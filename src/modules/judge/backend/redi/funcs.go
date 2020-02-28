package redi

import (
	"encoding/json"
	"errors"
	"fmt"

	"github.com/didi/nightingale/src/dataobj"

	"github.com/toolkits/pkg/logger"
)

func Push(event *dataobj.Event) error {
	bytes, err := json.Marshal(event)
	if err != nil {
		err = fmt.Errorf("redis publish failed, error:%v", err)
		return err
	}

	succ := false
	if len(RedisConnPools) == 0 {
		return errors.New("redis publish failed: empty conn pool")
	}

	for i := range RedisConnPools {
		rc := RedisConnPools[i].Get()
		defer rc.Close()

		// 写入用lpush 读出应该用 rpop
		_, err = rc.Do("RPUSH", event.Partition, string(bytes))

		if err == nil {
			succ = true
			break
		}
	}

	if succ {
		logger.Debugf("redis publish succ, event: %s", string(bytes))
		return nil
	}

	return fmt.Errorf("redis publish failed finally:%v", err)
}
