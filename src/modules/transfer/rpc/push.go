package rpc

import (
	"fmt"
	"time"

	"github.com/didi/nightingale/src/dataobj"
	"github.com/didi/nightingale/src/modules/transfer/backend"
	. "github.com/didi/nightingale/src/modules/transfer/config"

	"github.com/toolkits/pkg/logger"
)

func (t *Transfer) Ping(args string, reply *string) error {
	*reply = args
	return nil
}

func (t *Transfer) Push(args []*dataobj.MetricValue, reply *dataobj.TransferResp) error {
	start := time.Now()
	reply.Invalid = 0

	items := []*dataobj.MetricValue{}
	for _, v := range args {
		logger.Debug("->recv: ", v)
		err := v.CheckValidity()
		if err != nil {
			logger.Warningf("item is illegal item:%s err:%v", v, err)
			reply.Invalid += 1
			reply.Msg += fmt.Sprintf("%v\n", err)
			continue
		}

		items = append(items, v)
	}

	if Config.Tsdb.Enabled {
		backend.Push2TsdbSendQueue(items)
	}

	if Config.Judge.Enabled {
		backend.Push2JudgeSendQueue(items)
	}
	if reply.Invalid == 0 {
		reply.Msg = "ok"
	}

	reply.Total = len(args)
	reply.Latency = (time.Now().UnixNano() - start.UnixNano()) / 1000000
	return nil
}
