package backend

import (
	"fmt"
	"math/rand"
	"time"

	"github.com/toolkits/pkg/container/list"
	"github.com/toolkits/pkg/container/set"
	"github.com/toolkits/pkg/logger"
	"github.com/toolkits/pkg/net/httplib"
	"github.com/toolkits/pkg/pool"
	"github.com/toolkits/pkg/str"

	"github.com/didi/nightingale/src/model"
	"github.com/didi/nightingale/src/modules/transfer/cache"
	. "github.com/didi/nightingale/src/modules/transfer/config"
	"github.com/didi/nightingale/src/toolkits/address"
)

var (
	// 服务节点的一致性哈希环 pk -> node
	TsdbNodeRing *ConsistentHashRing

	// 发送缓存队列 node -> queue_of_data
	TsdbQueues  = make(map[string]*list.SafeListLimited)
	JudgeQueues = cache.SafeJudgeQueue{}

	// 连接池 node_address -> connection_pool
	TsdbConnPools  *ConnPools = &ConnPools{M: make(map[string]*pool.ConnPool)}
	JudgeConnPools *ConnPools = &ConnPools{M: make(map[string]*pool.ConnPool)}

	connTimeout int32
	callTimeout int32
)

func Init() {
	// 初始化默认参数
	connTimeout = int32(Config.Tsdb.ConnTimeout)
	callTimeout = int32(Config.Tsdb.CallTimeout)

	MinStep = Config.MinStep
	if MinStep < 1 {
		MinStep = 1 //默认10s
	}

	initHashRing()
	initConnPools()
	initSendQueues()

	startSendTasks()
}

func initHashRing() {
	TsdbNodeRing = NewConsistentHashRing(int32(Config.Tsdb.Replicas), str.KeysOfMap(Config.Tsdb.Cluster))
}

func initConnPools() {
	tsdbInstances := set.NewSafeSet()
	for _, item := range Config.Tsdb.ClusterList {
		for _, addr := range item.Addrs {
			tsdbInstances.Add(addr)
		}
	}
	TsdbConnPools = CreateConnPools(Config.Tsdb.MaxConns, Config.Tsdb.MaxIdle,
		Config.Tsdb.ConnTimeout, Config.Tsdb.CallTimeout, tsdbInstances.ToSlice())

	JudgeConnPools = CreateConnPools(Config.Judge.MaxConns, Config.Judge.MaxIdle,
		Config.Judge.ConnTimeout, Config.Judge.CallTimeout, GetJudges())

}

func initSendQueues() {
	for node, item := range Config.Tsdb.ClusterList {
		for _, addr := range item.Addrs {
			TsdbQueues[node+addr] = list.NewSafeListLimited(DefaultSendQueueMaxSize)
		}
	}

	JudgeQueues = cache.NewJudgeQueue()
	judges := GetJudges()
	for _, judge := range judges {
		JudgeQueues.Set(judge, list.NewSafeListLimited(DefaultSendQueueMaxSize))
	}
}

type judgeRes struct {
	Err string         `json:"err"`
	Dat []*model.Judge `json:"dat"`
}

func GetJudges() []string {
	addrs := address.GetHTTPAddresses("monapi")
	perm := rand.Perm(len(addrs))

	var (
		judgeInstance []string
		body          judgeRes
	)

	for i := range perm {
		url := fmt.Sprintf("http://%s/api/hbs/judges", addrs[perm[i]])
		err := httplib.Get(url).SetTimeout(3 * time.Second).ToJSON(&body)

		if err != nil {
			logger.Warningf("curl %s fail: %v", url, err)
			continue
		}

		if body.Err != "" {
			logger.Warningf("curl %s fail: %v", url, body.Err)
			continue
		}

		for _, judge := range body.Dat {
			if judge.Active {
				instance := judge.IP + ":" + judge.Port
				judgeInstance = append(judgeInstance, instance)
			}
		}
		return judgeInstance
	}
	return judgeInstance
}
