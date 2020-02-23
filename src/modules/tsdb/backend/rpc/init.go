package rpc

import (
	"github.com/didi/nightingale/src/modules/tsdb/config"

	"github.com/toolkits/pkg/pool"
)

var (
	// 连接池 node_address -> connection_pool
	IndexConnPools *ConnPools = &ConnPools{M: make(map[string]*pool.ConnPool)}

	connTimeout int32
	callTimeout int32
)

func Init() {
	// 初始化默认参数
	connTimeout = int32(config.Config.Index.ConnTimeout)
	callTimeout = int32(config.Config.Index.CallTimeout)

	initConnPools()
}

func initConnPools() {
	cfg := config.Config
	IndexConnPools = CreateConnPools(cfg.Index.MaxConns, cfg.Index.MaxIdle,
		cfg.Index.ConnTimeout, cfg.Index.CallTimeout, config.IndexAddrs.Get())
}
