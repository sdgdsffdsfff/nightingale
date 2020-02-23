package cron

import (
	"fmt"
	"math/rand"
	"time"

	"github.com/toolkits/pkg/logger"
	"github.com/toolkits/pkg/net/httplib"

	"github.com/didi/nightingale/src/modules/index/config"
	"github.com/didi/nightingale/src/toolkits/address"
)

func Report() {
	ReportCfg := config.Config.Report
	if !ReportCfg.Enabled {
		return
	}

	addrs := address.GetHTTPAddresses("monapi")

	t1 := time.NewTicker(time.Duration(ReportCfg.Interval) * time.Millisecond)
	report(config.Identity, config.RpcPort, config.HttpPort, addrs)
	for {
		<-t1.C
		report(config.Identity, config.RpcPort, config.HttpPort, addrs)
	}
}

type reportRes struct {
	Err string `json:"err"`
	Dat string `json:"dat"`
}

func report(ip, rpcPort, httpPort string, addrs []string) {
	perm := rand.Perm(len(addrs))
	for i := range perm {
		url := fmt.Sprintf("http://%s/api/hbs/report-index-heartbeat", addrs[perm[i]])

		m := map[string]string{
			"ip":        ip,
			"rpc_port":  rpcPort,
			"http_port": httpPort,
		}

		var body reportRes
		err := httplib.Post(url).JSONBodyQuiet(m).SetTimeout(3 * time.Second).ToJSON(&body)
		if err != nil {
			logger.Errorf("curl %s fail: %v", url, err)
			continue
		}

		if body.Err != "" {
			logger.Error(body.Err)
			continue
		}

		return
	}
}
