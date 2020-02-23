package migrate

import (
	"sync"

	. "github.com/didi/nightingale/src/modules/tsdb/config"

	"github.com/toolkits/pkg/container/list"
	"github.com/toolkits/pkg/container/set"
	"github.com/toolkits/pkg/logger"
	"github.com/toolkits/pkg/pool"
	"github.com/toolkits/pkg/str"
)

const (
	DefaultSendQueueMaxSize = 102400 //10.24w
)

var (
	QueueCheck = QueueFilter{Data: make(map[interface{}]struct{})}

	TsdbQueues    = make(map[string]*list.SafeListLimited)
	NewTsdbQueues = make(map[string]*list.SafeListLimited)
	RRDFileQueues = make(map[string]*list.SafeListLimited)
	// 服务节点的一致性哈希环 pk -> node
	TsdbNodeRing    *ConsistentHashRing
	NewTsdbNodeRing *ConsistentHashRing

	// 连接池 node_address -> connection_pool
	TsdbConnPools    *ConnPools = &ConnPools{M: make(map[string]*pool.ConnPool)}
	NewTsdbConnPools *ConnPools = &ConnPools{M: make(map[string]*pool.ConnPool)}
)

type QueueFilter struct {
	Data map[interface{}]struct{}
	sync.RWMutex
}

func (q *QueueFilter) Exists(key interface{}) bool {
	q.RLock()
	defer q.RUnlock()

	_, exsits := q.Data[key]
	return exsits
}

func (q *QueueFilter) Set(key interface{}) {
	q.Lock()
	defer q.Unlock()

	q.Data[key] = struct{}{}
	return
}

func Init() {
	logger.Info("migrate start...")
	initHashRing()
	initConnPools()
	initQueues()
	StartMigrate()
}

func initHashRing() {
	TsdbNodeRing = NewConsistentHashRing(int32(Config.Migrate.Replicas), str.KeysOfMap(Config.Migrate.OldCluster))
	NewTsdbNodeRing = NewConsistentHashRing(int32(Config.Migrate.Replicas), str.KeysOfMap(Config.Migrate.NewCluster))
}

func initConnPools() {
	// tsdb
	tsdbInstances := set.NewSafeSet()
	for _, addr := range Config.Migrate.OldCluster {
		tsdbInstances.Add(addr)
	}
	TsdbConnPools = CreateConnPools(Config.Migrate.MaxConns, Config.Migrate.MaxIdle,
		Config.Migrate.ConnTimeout, Config.Migrate.CallTimeout, tsdbInstances.ToSlice())

	// tsdb
	newTsdbInstances := set.NewSafeSet()
	for _, addr := range Config.Migrate.NewCluster {
		newTsdbInstances.Add(addr)
	}
	NewTsdbConnPools = CreateConnPools(Config.Migrate.MaxConns, Config.Migrate.MaxIdle,
		Config.Migrate.ConnTimeout, Config.Migrate.CallTimeout, newTsdbInstances.ToSlice())
}

func initQueues() {
	for node := range Config.Migrate.OldCluster {
		RRDFileQueues[node] = list.NewSafeListLimited(DefaultSendQueueMaxSize)
	}

	for node := range Config.Migrate.OldCluster {
		TsdbQueues[node] = list.NewSafeListLimited(DefaultSendQueueMaxSize)
	}

	for node := range Config.Migrate.NewCluster {
		NewTsdbQueues[node] = list.NewSafeListLimited(DefaultSendQueueMaxSize)
	}
}
