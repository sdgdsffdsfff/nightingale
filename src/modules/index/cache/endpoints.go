package cache

import (
	"fmt"
	"math/rand"
	"time"

	"github.com/didi/nightingale/src/toolkits/address"

	"github.com/toolkits/pkg/concurrent/semaphore"
	"github.com/toolkits/pkg/logger"
	"github.com/toolkits/pkg/net/httplib"
)

func ReportEndpoint() {
	sema := semaphore.NewSemaphore(10)
	for {
		endpoints := NewEndpoints.PopBackBy(500)
		if len(endpoints) == 0 {
			time.Sleep(1 * time.Second)
			continue
		}

		sema.Acquire()
		go func(endpoints []interface{}) {
			defer sema.Release()
			reportEndpoint(endpoints)
		}(endpoints)
	}
}

type reportRes struct {
	Err string `json:"err"`
	Dat string `json:"dat"`
}

func reportEndpoint(endpoints []interface{}) {
	addrs := address.GetHTTPAddresses("monapi")
	perm := rand.Perm(len(addrs))
	for i := range perm {
		url := fmt.Sprintf("http://%s/v1/portal/endpoint", addrs[perm[i]])

		m := map[string][]interface{}{
			"endpoints": endpoints,
		}

		var body reportRes
		err := httplib.Post(url).JSONBodyQuiet(m).SetTimeout(3 * time.Second).ToJSON(&body)
		if err != nil {
			logger.Warningf("curl %s fail: %v", url, err)
			continue
		}

		if body.Err != "" {
			logger.Warningf("curl %s fail: %s", url, body.Err)
			continue
		}

		return
	}
}
