package backend

import (
	"github.com/toolkits/pkg/container/list"
	"github.com/toolkits/pkg/container/set"
	"github.com/toolkits/pkg/pool"
	"github.com/toolkits/pkg/str"

	"github.com/didi/nightingale/src/modules/transfer/cache"
	. "github.com/didi/nightingale/src/modules/transfer/config"
	"github.com/didi/nightingale/src/toolkits/report"
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

func GetJudges() []string {
	var judgeInstances []string
	instances := report.GetAlive("judge", "monapi")
	for _, instance := range instances {
		judgeInstance := instance.Identity + ":" + instance.RPCPort
		judgeInstances = append(judgeInstances, judgeInstance)
	}
	return judgeInstances
}
