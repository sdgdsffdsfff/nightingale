package query

import (
	"errors"
	"math/rand"
	"time"

	"github.com/didi/nightingale/src/dataobj"
	"github.com/didi/nightingale/src/modules/judge/config"
	"github.com/didi/nightingale/src/modules/judge/logger"
	"github.com/didi/nightingale/src/toolkits/str"

	"github.com/toolkits/pkg/net/httplib"
)

var (
	ErrorIndexParamIllegal = errors.New("index param illegal")
	ErrorQueryParamIllegal = errors.New("query param illegal")
)

type IndexRequest struct {
	Endpoints []string            `json:"endpoints"`
	Metric    string              `json:"metric"`
	Include   map[string][]string `json:"include"`
	Exclude   map[string][]string `json:"exclude"`
}

type Counter struct {
	Counter string `json:"counter"`
	Step    int    `json:"step"`
	Dstype  string `json:"dstype`
}

// 执行Query操作
// 默认不重试, 如果要做重试, 在这里完成
func Query(reqs []*dataobj.QueryData) ([]*dataobj.TsdbQueryResponse, error) {

	var resp *dataobj.QueryDataResp
	var err error
	for i := 0; i < 3; i++ {
		err = TransferConnPools.Call("Transfer.Query", reqs, &resp)
		if err == nil {
			break
		}
	}
	if err != nil {
		return nil, err
	}
	if resp.Msg != "" {
		return nil, errors.New(resp.Msg)
	}
	return resp.Data, nil
}

func NewQueryRequest(endpoint, metric string, tagsMap map[string]string,
	start, end int64) (*dataobj.QueryData, error) {
	if end <= start || start < 0 {
		return nil, ErrorQueryParamIllegal
	}

	var counter string
	if len(tagsMap) == 0 {
		counter = metric
	} else {
		counter = metric + "/" + str.SortedTags(tagsMap)
	}
	return &dataobj.QueryData{
		Start:      start,
		End:        end,
		ConsolFunc: "AVERAGE", // 硬编码
		Endpoints:  []string{endpoint},
		Counters:   []string{counter},
	}, nil
}

/********* 补全索引相关 *********/
type XCludeStruct struct {
	Tagk string   `json:"tagk"`
	Tagv []string `json:"tagv"`
}

type IndexReq struct {
	Endpoints []string       `json:"endpoints"`
	Metric    string         `json:"metric"`
	Include   []XCludeStruct `json:"include,omitempty"`
	Exclude   []XCludeStruct `json:"exclude,omitempty"`
}

type IndexData struct {
	Endpoint string   `json:"endpoint"`
	Metric   string   `json:"metric"`
	Tags     []string `json:"tags"`
	Step     int      `json:"step"`
	Dstype   string   `json:"dstype"`
}

type IndexResp struct {
	Data []IndexData `json:"dat"`
	Err  string      `json:"err"`
}

// index的xclude 不支持批量查询, 暂时不做
func Xclude(request *IndexReq) ([]IndexData, error) {
	if len(config.Config.Query.IndexAddrs) == 0 {
		return nil, errors.New("empty index addr")
	}

	var (
		result IndexResp
		succ   bool = false
	)
	perm := rand.Perm(len(config.Config.Query.IndexAddrs))
	for i := range perm {
		url := config.Config.Query.IndexAddrs[perm[i]]
		err := httplib.Post(url).JSONBodyQuiet([]IndexReq{*request}).SetTimeout(time.Duration(config.Config.Query.IndexCallTimeout) * time.Millisecond).ToJSON(&result)
		if err != nil {
			logger.Warningf(0, "index xclude failed, error:%v, req:%v", err, request)
			continue
		} else {
			succ = true
			break
		}
	}

	if !succ {
		return nil, errors.New("index xclude failed")
	}

	if result.Err != "" {
		return nil, errors.New(result.Err)
	}
	return result.Data, nil
}
