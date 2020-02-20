package nsq

import (
	"encoding/json"
	"math/rand"
	"time"

	"github.com/didi/nightingale/src/dataobj"
	. "github.com/didi/nightingale/src/modules/tsdb/config"

	"github.com/nsqio/go-nsq"
	"github.com/toolkits/pkg/logger"
)

type WriterList []*nsq.Producer

var MQWriters WriterList

//var nsemaPublish *nsema.Semaphore

func OpenMQWriter() {
	nsqConfig := Config.NSQ
	if !nsqConfig.Enabled {
		logger.Info("queue.OpenMQWriter warning, not enabled")
		return
	}

	conf := nsq.NewConfig()
	MQWriters = make([]*nsq.Producer, len(nsqConfig.Addrs))
	//nsemaPublish = nsema.NewSemaphore(10)
	var err error

	for i := 0; i < len(nsqConfig.Addrs); i++ {
		MQWriters[i], err = nsq.NewProducer(nsqConfig.Addrs[i], conf)
		if err != nil {
			logger.Fatalf("create nsq producer [addr:%s] failed: %v ", nsqConfig.Addrs[i], err)
		}

		err := MQWriters[i].Ping()
		if err != nil {
			logger.Fatalf("ping nsq writer [%s] fail: %v", nsqConfig.Addrs[i], err)
		}
	}
	logger.Info("init nsq writers done!")
}

func CloseMQWriter() {
	nsqConfig := Config.NSQ
	if !nsqConfig.Enabled {
		return
	}

	for _, mqWriter := range MQWriters {
		if mqWriter != nil {
			mqWriter.Stop()
		}
	}
}

func (this WriterList) Push(items []*dataobj.TsdbItem, topics []string) {
	nsqConfig := Config.NSQ
	if !nsqConfig.Enabled {
		return
	}

	if len(items) == 0 {
		return
	}

	bodyList := make([]dataobj.IndexModel, len(items))

	for i, item := range items {
		var tmp dataobj.IndexModel

		tmp.Endpoint = item.Endpoint
		tmp.Metric = item.Metric
		tmp.Step = item.Step
		tmp.DsType = item.DsType
		if len(item.TagsMap) == 0 {
			tmp.Tags = make(map[string]string)
		} else {
			tmp.Tags = item.TagsMap
		}

		tmp.Timestamp = item.Timestamp
		bodyList[i] = tmp
	}

	if len(topics) == 0 {
		return
	}

	jsonItem, err := json.Marshal(bodyList)
	if err != nil {
		logger.Errorf("[index]write to nsq failed[marshal]:%v", err)
	}

	writer := getRandNSQ()
	for _, topicStr := range topics {
		err = writer.Publish(topicStr, jsonItem)
		if err != nil {
			logger.Errorf("[index]write to nsq failed[push]:%v", err)
			for i := 0; i < 3; i++ {
				err = writer.Publish(topicStr, jsonItem)
				if err != nil {
					logger.Errorf("[index]retry %d time write to nsq failed:%v", i+1, err)
				} else {
					logger.Infof("[index]retry %d time write to nsq success:%v", i+1, err)
					break
				}
			}
		}
	}
}

func getRandNSQ() *nsq.Producer {
	nsqNum := len(MQWriters)
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	index := r.Intn(nsqNum)
	return MQWriters[index]
}
