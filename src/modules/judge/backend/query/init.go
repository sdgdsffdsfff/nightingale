package query

import "github.com/didi/nightingale/src/modules/judge/config"

var (
	TransferConnPools *ConnPools = &ConnPools{}

	connTimeout int32
	callTimeout int32
)

func InitConnPools() {
	TransferConnPools = CreateConnPools(config.Config.Query.MaxConn, config.Config.Query.MaxIdle,
		config.Config.Query.ConnTimeout, config.Config.Query.CallTimeout, config.Config.Query.Addrs)
}
