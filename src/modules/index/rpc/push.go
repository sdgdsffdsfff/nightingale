package rpc

import (
	"fmt"
	"sync/atomic"
	"time"

	"github.com/didi/nightingale/src/dataobj"
	"github.com/didi/nightingale/src/modules/index/cache"
	"github.com/didi/nightingale/src/modules/index/config"

	"github.com/toolkits/pkg/concurrent/semaphore"
	"github.com/toolkits/pkg/logger"
)

var nsemaPush *semaphore.Semaphore

func (this *Index) Ping(args string, reply *string) error {
	*reply = args
	return nil
}

func (this *Index) IncrPush(args []*dataobj.IndexModel, reply *dataobj.IndexResp) error {
	push(args, reply)
	atomic.AddInt64(&config.IncrIndexIn, int64(len(args)))
	return nil
}

func (this *Index) Push(args []*dataobj.IndexModel, reply *dataobj.IndexResp) error {
	push(args, reply)
	atomic.AddInt64(&config.IndexIn, int64(len(args)))
	return nil
}

func push(args []*dataobj.IndexModel, reply *dataobj.IndexResp) {
	start := time.Now()
	reply.Invalid = 0
	now := time.Now().Unix()
	for _, item := range args {
		logger.Debugf("<index %v", item)
		err := cache.EndpointDBObj.Push(*item, now)
		if err != nil {
			logger.Errorf("message push failed : %v", err)
			reply.Invalid += 1
			reply.Msg += fmt.Sprintf("%v\n", err)
			atomic.AddInt64(&config.IndexInErr, 1)
		}
	}

	if reply.Invalid == 0 {
		reply.Msg = "ok"
	}

	reply.Total = len(args)
	reply.Latency = (time.Now().UnixNano() - start.UnixNano()) / 1000000
	return
}
