package backend

import (
	"errors"
	"fmt"
	"math"
	"math/rand"
	"strings"
	"time"

	"github.com/didi/nightingale/src/dataobj"
	"github.com/didi/nightingale/src/modules/transfer/calc"

	"github.com/toolkits/pkg/logger"
	"github.com/toolkits/pkg/pool"
)

func FetchData(inputs []dataobj.QueryData) []*dataobj.TsdbQueryResponse {
	resp := []*dataobj.TsdbQueryResponse{}
	workerNum := 100
	worker := make(chan struct{}, workerNum) //控制goroutine并发数
	dataChan := make(chan *dataobj.TsdbQueryResponse, 20000)

	for _, input := range inputs {
		for _, endpoint := range input.Endpoints {
			for _, counter := range input.Counters {
				worker <- struct{}{}
				go fetchDataSync(input.Start, input.End, input.ConsolFunc, endpoint, counter, input.Step, worker, dataChan)
			}
		}
	}

	//等待所有goroutine执行完成
	for i := 0; i < workerNum; i++ {
		worker <- struct{}{}
	}

	close(dataChan)
	for {
		d, ok := <-dataChan
		if !ok {
			break
		}
		resp = append(resp, d)
	}

	return resp
}

func FetchDataForUI(input dataobj.QueryDataForUI) []*dataobj.TsdbQueryResponse {
	resp := []*dataobj.TsdbQueryResponse{}
	workerNum := 100
	worker := make(chan struct{}, workerNum) //控制goroutine并发数
	dataChan := make(chan *dataobj.TsdbQueryResponse, 20000)

	for _, endpoint := range input.Endpoints {
		if len(input.Tags) == 0 {
			counter, err := getCounter(input.Metric, "", nil)
			if err != nil {
				logger.Warning(err)
				continue
			}
			worker <- struct{}{}
			go fetchDataSync(input.Start, input.End, input.ConsolFunc, endpoint, counter, input.Step, worker, dataChan)
		} else {
			for _, tag := range input.Tags {
				counter, err := getCounter(input.Metric, tag, nil)
				if err != nil {
					logger.Warning(err)
					continue
				}
				worker <- struct{}{}
				go fetchDataSync(input.Start, input.End, input.ConsolFunc, endpoint, counter, input.Step, worker, dataChan)
			}
		}
	}

	//等待所有goroutine执行完成
	for i := 0; i < workerNum; i++ {
		worker <- struct{}{}
	}

	close(dataChan)
	for {
		d, ok := <-dataChan
		if !ok {
			break
		}
		resp = append(resp, d)
	}

	//进行数据计算
	aggrDatas := []*dataobj.TsdbQueryResponse{}
	if input.AggrFunc != "" && len(resp) > 1 {
		aggrData := &dataobj.TsdbQueryResponse{
			Start: input.Start,
			End:   input.End,
		}

		aggrCounter := make(map[string][]*dataobj.TsdbQueryResponse)
		if len(input.GroupKey) == 0 || getTags(resp[0].Counter) == "" {
			//没有聚合 tag, 或者曲线没有其他 tags, 直接所有曲线进行计算
			aggrData.Values = calc.Compute(input.AggrFunc, resp)
			aggrDatas = append(aggrDatas, aggrData)
		} else {
			for _, data := range resp {
				counterMap := make(map[string]string)

				tagsMap, err := dataobj.SplitTagsString(getTags(data.Counter))
				if err != nil {
					logger.Warning(err)
					continue
				}
				tagsMap["endpoint"] = data.Endpoint

				for _, key := range input.GroupKey {
					value, exists := tagsMap[key]
					if exists {
						counterMap[key] = value
					}
				}

				counter := dataobj.SortedTags(counterMap)
				if _, exists := aggrCounter[counter]; exists {
					aggrCounter[counter] = append(aggrCounter[counter], data)
				} else {
					aggrCounter[counter] = []*dataobj.TsdbQueryResponse{data}
				}
			}

			for counter, datas := range aggrCounter {
				aggrData.Counter = counter
				aggrData.Values = calc.Compute(input.AggrFunc, datas)

				aggrDatas = append(aggrDatas, aggrData)
			}
		}
		return aggrDatas
	}
	return resp
}

func getCounter(metric, tag string, tagMap map[string]string) (counter string, err error) {
	if tagMap == nil {
		tagMap, err = dataobj.SplitTagsString(tag)
		if err != nil {
			logger.Warning(err, tag)
			return
		}
	}

	tagStr := dataobj.SortedTags(tagMap)
	counter = dataobj.PKWithTags(metric, tagStr)
	return
}

func fetchDataSync(start, end int64, consolFun, endpoint, counter string, step int, worker chan struct{}, dataChan chan *dataobj.TsdbQueryResponse) {
	defer func() {
		<-worker
	}()

	data, err := fetchData(start, end, consolFun, endpoint, counter, step)
	if err != nil {
		logger.Warning(err)
	}
	dataChan <- data
	return
}

func fetchData(start, end int64, consolFun, endpoint, counter string, step int) (*dataobj.TsdbQueryResponse, error) {
	var resp *dataobj.TsdbQueryResponse

	qparm := GenQParam(start, end, consolFun, endpoint, counter, step)
	resp, err := QueryOne(qparm)
	if err != nil {
		return resp, err
	}

	if len(resp.Values) < 1 {
		ts := start - start%int64(60)
		count := (end - start) / 60
		if count > 730 {
			count = 730
		}

		if count <= 0 {
			return resp, nil
		}

		step := (end - start) / count // integer divide by zero
		for i := 0; i < int(count); i++ {
			resp.Values = append(resp.Values, &dataobj.RRDData{Timestamp: ts, Value: dataobj.JsonFloat(math.NaN())})
			ts += int64(step)
		}
	}
	resp.Start = start
	resp.End = end

	return resp, nil
}

func getCounterStep(endpoint, counter string) (step int, err error) {
	//从内存中获取
	return
}

func GenQParam(start, end int64, consolFunc, endpoint, counter string, step int) dataobj.TsdbQueryParam {
	return dataobj.TsdbQueryParam{
		Start:      start,
		End:        end,
		ConsolFunc: consolFunc,
		Endpoint:   endpoint,
		Counter:    counter,
		Step:       step,
	}
}

func QueryOne(para dataobj.TsdbQueryParam) (resp *dataobj.TsdbQueryResponse, err error) {
	start, end := para.Start, para.End
	resp = &dataobj.TsdbQueryResponse{}

	pk := dataobj.PKWithCounter(para.Endpoint, para.Counter)
	pools, err := selectPoolByPK(pk)
	if err != nil {
		return resp, err
	}

	count := len(pools)
	for _, i := range rand.Perm(count) {
		pool := pools[i].Pool
		addr := pools[i].Addr

		conn, err := pool.Fetch()
		if err != nil {
			logger.Error(err)
			continue
		}

		rpcConn := conn.(RpcClient)
		if rpcConn.Closed() {
			pool.ForceClose(conn)

			err = errors.New("conn closed")
			logger.Error(err)
			continue
		}

		type ChResult struct {
			Err  error
			Resp *dataobj.TsdbQueryResponse
		}

		ch := make(chan *ChResult, 1)
		go func() {
			resp := &dataobj.TsdbQueryResponse{}
			err := rpcConn.Call("Tsdb.Query", para, resp)
			ch <- &ChResult{Err: err, Resp: resp}
		}()

		select {
		case <-time.After(time.Duration(callTimeout) * time.Millisecond):
			pool.ForceClose(conn)
			logger.Errorf("%s, call timeout. proc: %s", addr, pool.Proc())
			break
		case r := <-ch:
			if r.Err != nil {
				pool.ForceClose(conn)
				logger.Errorf("%s, call failed, err %v. proc: %s", addr, r.Err, pool.Proc())
				break

			} else {
				pool.Release(conn)
				if len(r.Resp.Values) < 1 {
					r.Resp.Values = []*dataobj.RRDData{}
					return r.Resp, nil
				}

				fixed := []*dataobj.RRDData{}
				for _, v := range r.Resp.Values {
					if v == nil || !(v.Timestamp >= start && v.Timestamp <= end) {
						continue
					}

					fixed = append(fixed, v)
				}
				r.Resp.Values = fixed
			}
			return r.Resp, nil
		}

	}
	return resp, fmt.Errorf("get data error")

}

type Pool struct {
	Pool *pool.ConnPool
	Addr string
}

func selectPoolByPK(pk string) ([]Pool, error) {
	node, err := TsdbNodeRing.GetNode(pk)
	if err != nil {
		return []Pool{}, err
	}

	nodeAddrs, found := Config.ClusterList[node]
	if !found {
		return []Pool{}, errors.New("node not found")
	}

	var pools []Pool
	for _, addr := range nodeAddrs.Addrs {
		pool, found := TsdbConnPools.Get(addr)
		if !found {
			logger.Errorf("addr %s not found", addr)
			continue
		}
		p := Pool{
			Pool: pool,
			Addr: addr,
		}
		pools = append(pools, p)
	}

	if len(pools) < 1 {
		return pools, errors.New("addr not found")
	}

	return pools, nil

}

func getTags(counter string) (tags string) {
	idx := strings.IndexAny(counter, "/")
	if idx == -1 {
		return ""
	}
	return counter[idx+1:]
}
