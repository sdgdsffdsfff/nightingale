package cron

import (
	"fmt"
	"math/rand"
	"time"

	"github.com/toolkits/pkg/logger"
	"github.com/toolkits/pkg/net/httplib"
)

func Report(ip, port string, addrs []string, interval int) {
	t1 := time.NewTicker(time.Duration(interval) * time.Millisecond)
	report(ip, port, addrs)
	for {
		<-t1.C
		report(ip, port, addrs)
	}
}

type reportRes struct {
	Err string `json:"err"`
	Dat string `json:"dat"`
}

func report(ip, port string, addrs []string) {
	perm := rand.Perm(len(addrs))
	var body reportRes
	for i := range perm {
		url := fmt.Sprintf("http://%s/api/hbs/report-judge-heartbeat", addrs[perm[i]])

		m := map[string]string{
			"ip":   ip,
			"port": port,
		}

		err := httplib.Post(url).JSONBodyQuiet(m).SetTimeout(time.Second * 2).ToJSON(&body)
		if err != nil {
			logger.Warningf("curl %s fail: %v", url, err)
			continue
		}

		if body.Err != "" {
			logger.Warningf("curl %s fail: %v", url, body.Err)
			continue
		}

		return
	}
}
