package cron

import (
	"fmt"
	"strconv"
	"time"

	"github.com/toolkits/pkg/consistent"
	"github.com/toolkits/pkg/logger"

	"github.com/didi/nightingale/src/model"
	"github.com/didi/nightingale/src/modules/monapi/config"
	"github.com/didi/nightingale/src/modules/monapi/scache"
)

func CheckJudgeLoop() {
	duration := time.Duration(3) * time.Second
	for {
		time.Sleep(duration)
		err := CheckJudge()
		if err != nil {
			logger.Error("check judge fail: ", err)
		}
	}
}

func CheckJudge() error {
	judges, err := model.GetActiveJudges()
	if err != nil {
		return fmt.Errorf("model.GetActiveJudges fail: %v", err)
	}

	size := len(judges)
	if size == 0 {
		// 看来所有的judge都挂了，此时更新hash环也没啥意义
		return fmt.Errorf("judges count is zero")
	}

	jmap := make(map[string]string, size)
	for i := 0; i < size; i++ {
		jmap[strconv.FormatInt(judges[i].Id, 10)] = judges[i].IP + ":" + judges[i].Port
	}

	rehash := false
	if scache.JudgeActiveNode.Len() != len(jmap) {
		//scache.JudgeActiveNode中的node数量和新获取的不同，重新rehash
		rehash = true
	} else {
		for node, instance := range jmap {
			v, exists := scache.JudgeActiveNode.GetInstanceBy(node)
			if !exists || instance != v {
				rehash = true
				break
			}
		}
	}

	if rehash {
		scache.JudgeActiveNode.Set(jmap)

		//重建judge hash环
		r := consistent.New()
		r.NumberOfReplicas = config.JudgesReplicas
		nodes := scache.JudgeActiveNode.GetNodes()
		for _, node := range nodes {
			r.Add(node)
		}
		scache.JudgeHashRing.Set(r)

		logger.Warning("judge hash ring rebuild ", r.Members())
	}

	return nil
}
