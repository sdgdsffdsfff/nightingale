package cron

import (
	"encoding/json"
	"sort"
	"time"

	"github.com/toolkits/pkg/logger"

	"github.com/didi/nightingale/src/model"
	"github.com/didi/nightingale/src/modules/portal/config"
	"github.com/didi/nightingale/src/modules/portal/notify"
	"github.com/didi/nightingale/src/modules/portal/redisc"
)

func MergeEvent() {
	mergeCfg := config.Get().Alarm.Merge
	for {
		eventMap := getAllEventFromMergeHash(mergeCfg.Hash)
		if eventMap != nil {
			parseMergeEvent(eventMap)
		}
		time.Sleep(time.Duration(mergeCfg.Interval) * time.Second)
	}
}

func getAllEventFromMergeHash(hash string) map[int64][]*model.Event {
	eventMap := make(map[int64][]*model.Event)

	eventStringSlice, err := redisc.HKEYS(hash)
	if err != nil {
		logger.Errorf("hkeys from %v failed, err: %v", hash, err)
		return nil
	}

	for _, es := range eventStringSlice {
		event := new(model.Event)
		if err := json.Unmarshal([]byte(es), event); err != nil {
			logger.Errorf("getAllEventFromMergeHash: unmarshal failed, err: %v, event string: %v", err, es)
			continue
		}

		eventMap[event.Sid] = append(eventMap[event.Sid], event)
	}

	return eventMap
}

func storeLowEvent(event *model.Event) {
	es, err := json.Marshal(event)
	if err != nil {
		logger.Errorf("storeLowEvent: marsh event failed, err: %v, event: %+v", err, event)
		return
	}

	mergeCfg := config.Get().Alarm.Merge

	if _, err := redisc.HSET(mergeCfg.Hash, string(es), ""); err != nil {
		logger.Errorf("hset event to %v failed, err: %v, event: %+v", mergeCfg.Hash, err, event)
		return
	}

	logger.Infof("hset event to %v succ, event: %+v", mergeCfg.Hash, event)
}

func parseMergeEvent(eventMap map[int64][]*model.Event) {
	mergeCfg := config.Get().Alarm.Merge

	hash := mergeCfg.Hash
	max := mergeCfg.Max

	// 需要删除redis中已经处理的events
	eventStringsHashKey := []interface{}{hash}

	now := time.Now().Unix()
	for _, events := range eventMap {
		if events == nil {
			continue
		}

		var alertEvents []*model.Event
		var recoveryEvents []*model.Event

		for _, event := range events {
			if event.EventType == config.ALERT {
				alertEvents = append(alertEvents, event)
			} else {
				recoveryEvents = append(recoveryEvents, event)
			}
		}

		if len(alertEvents) > 0 {
			// 如果interval时间比较短，聚合效果会不好
			sort.Sort(model.EventSlice(alertEvents))
			if now-alertEvents[0].Etime < 60 {
				continue
			}

			for _, bounds := range config.SplitN(len(alertEvents), max) {
				go notify.DoNotify(false, alertEvents[bounds[0]:bounds[1]]...)
			}

			for i := range alertEvents {
				SetEventStatus(alertEvents[i], model.STATUS_SEND)

				data, err := json.Marshal(alertEvents[i])
				if err != nil {
					logger.Errorf("marshal event fail, err: %v", err)
					continue
				}
				eventStringsHashKey = append(eventStringsHashKey, string(data))
			}
		}

		if len(recoveryEvents) > 0 {
			sort.Sort(model.EventSlice(recoveryEvents))
			if now-recoveryEvents[0].Etime < 60 {
				continue
			}

			for _, bounds := range config.SplitN(len(recoveryEvents), max) {
				go notify.DoNotify(false, recoveryEvents[bounds[0]:bounds[1]]...)
			}

			for i := range recoveryEvents {
				SetEventStatus(recoveryEvents[i], model.STATUS_SEND)

				data, err := json.Marshal(recoveryEvents[i])
				if err != nil {
					logger.Errorf("marshal event fail, err: %v", err)
					continue
				}
				eventStringsHashKey = append(eventStringsHashKey, string(data))
			}
		}

	}

	if len(eventStringsHashKey) > 1 {
		if _, err := redisc.HDEL(eventStringsHashKey); err != nil {
			logger.Errorf("hdel events failed, err: %v, eventStringsHashKey: %+v", err, eventStringsHashKey)
		} else {
			logger.Infof("hdel events succ, eventStringsHashKey: %+v", eventStringsHashKey)
		}
	}

}
