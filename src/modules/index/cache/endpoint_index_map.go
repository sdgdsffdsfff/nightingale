package cache

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"os"
	"sync"
	"time"

	"github.com/didi/nightingale/src/dataobj"
	"github.com/didi/nightingale/src/toolkits/compress"

	"github.com/toolkits/pkg/logger"
)

type EndpointIndexMap struct { // ns -> metrics
	sync.RWMutex
	M map[string]*MetricIndexMap `json:"endpoint_index"` //map[endpoint]metricMap{map[metric]Index}
}

//push 索引数据
func (e *EndpointIndexMap) Push(item dataobj.IndexModel, now int64) {
	counter := dataobj.SortedTags(item.Tags)
	metric := item.Metric

	metricIndexMap, exists := e.GetMetricIndexMap(item.Endpoint)
	if !exists {
		metricIndexMap = &MetricIndexMap{Data: make(map[string]*MetricIndex)}
		metricIndexMap.SetMetricIndex(metric, NewMetricIndex(item, counter, now))
		e.SetMetricIndexMap(item.Endpoint, metricIndexMap)
		return
	}

	metricIndex, exists := metricIndexMap.GetMetricIndex(metric)
	if !exists {
		metricIndexMap.SetMetricIndex(metric, NewMetricIndex(item, counter, now))
		return
	}

	for k, v := range item.Tags {
		metricIndex.TagkvMap.Set(k, v, now)
	}
	metricIndex.CounterMap.Set(counter, now)

	return
}

func (e *EndpointIndexMap) Clean(timeDuration int64) {
	endpoints := e.GetEndpoints()
	now := time.Now().Unix()
	for _, endpoint := range endpoints {
		metricIndexMap, exists := e.GetMetricIndexMap(endpoint)
		if !exists {
			continue
		}

		metricIndexMap.Clean(now, timeDuration, endpoint)

		if metricIndexMap.Len() < 1 {
			e.Lock()
			delete(e.M, endpoint)
			e.Unlock()
			logger.Debug("clean index endpoint: ", endpoint)
		}
	}
}

func (e *EndpointIndexMap) GetMetricIndexMap(endpoint string) (*MetricIndexMap, bool) {
	e.RLock()
	defer e.RUnlock()
	metricIndexMap, exists := e.M[endpoint]
	return metricIndexMap, exists
}

func (e *EndpointIndexMap) GetMetricIndex(endpoint, metric string) (*MetricIndex, bool) {
	e.RLock()
	defer e.RUnlock()
	metricIndexMap, exists := e.M[endpoint]
	if !exists {
		return nil, false
	}
	return metricIndexMap.GetMetricIndex(metric)
}

func (e *EndpointIndexMap) SetMetricIndexMap(endpoint string, metricIndex *MetricIndexMap) {
	e.Lock()
	defer e.Unlock()
	e.M[endpoint] = metricIndex
}

func (e *EndpointIndexMap) GetMetricsBy(endpoint string) []string {
	e.RLock()
	defer e.RUnlock()
	if _, exists := e.M[endpoint]; !exists {
		return []string{}
	}
	return e.M[endpoint].GetMetrics()
}

func (e *EndpointIndexMap) GetIndexByClude(endpoint, metric string, include, exclude []*TagPair, max int) ([]string, error) {
	tagkvs, err := e.QueryTagkvMapBy(endpoint, metric)
	if err != nil {
		return []string{}, err
	}

	fullmatch := getMatchedTags(tagkvs, include, exclude)
	// 部分tagk的tagv全部被exclude 或者 完全没有匹配的
	if len(fullmatch) != len(tagkvs) || len(fullmatch) == 0 {
		return []string{}, nil
	}

	if OverMaxLimit(fullmatch, max) {
		err := fmt.Errorf("xclude fullmatch get too much counters,  endpoint:%s metric:%s, "+
			"include:%v, exclude:%v\n", endpoint, metric, include, exclude)
		return []string{}, err
	}

	return GetAllCounter(GetSortTags(fullmatch)), nil
}

func (e *EndpointIndexMap) QueryTagkvMapBy(endpoint, metric string) (map[string][]string, error) {
	tagkvs := make(map[string][]string)

	metricIndex, exists := e.GetMetricIndex(endpoint, metric)
	if !exists {
		return tagkvs, nil
	}

	tagkvs = metricIndex.TagkvMap.GetTagkvMap()
	return tagkvs, nil
}

func (e *EndpointIndexMap) GetEndpoints() []string {
	e.RLock()
	defer e.RUnlock()

	length := len(e.M)
	ret := make([]string, length)
	i := 0
	for endpoint, _ := range e.M {
		ret[i] = endpoint
		i++
	}
	return ret
}

func (e *EndpointIndexMap) Persist(mode string) error {
	if mode == "normal" || mode == "download" {
		if !semaPermanence.TryAcquire() {
			return fmt.Errorf("Permanence operate is Already running...")
		}
	} else if mode == "end" {
		semaPermanence.Acquire()
	} else {
		return fmt.Errorf("Your mode is Wrong![normal,end]")
	}
	var tmpDir string
	defer semaPermanence.Release()
	if mode == "download" {
		tmpDir = fmt.Sprintf("%s%s", PERMANENCE_DIR, "download")
	} else {
		tmpDir = fmt.Sprintf("%s%s", PERMANENCE_DIR, "tmp")
	}

	finalDir := fmt.Sprintf("%s%s", PERMANENCE_DIR, "db")

	var err error
	//清空tmp目录
	if err = os.RemoveAll(tmpDir); err != nil {
		return err
	}

	//创建tmp目录
	if err = os.MkdirAll(tmpDir, 0777); err != nil {
		return err
	}

	//填充tmp目录
	endpoints := e.GetEndpoints()
	logger.Infof("now start to save index data to disk...[ns-num:%d][mode:%s]\n", len(endpoints), mode)

	for i, endpoint := range endpoints {

		logger.Infof("sync [%s] to disk, [%d%%] complete\n", endpoint, int((float64(i)/float64(len(endpoints)))*100))
		metricIndexMap, exists := e.GetMetricIndexMap(endpoint)
		if !exists || metricIndexMap == nil {
			continue
		}

		metricIndexMap.Lock()
		body, err_m := json.Marshal(metricIndexMap)
		metricIndexMap.Unlock()

		if err_m != nil {
			logger.Errorf("marshal struct to json failed : [endpoint:%s][msg:%s]\n", endpoint, err_m.Error())
			continue
		}

		err = ioutil.WriteFile(fmt.Sprintf("%s/%s", tmpDir, endpoint), body, 0666)
		if err != nil {
			logger.Errorf("write file error : [endpoint:%s][msg:%s]\n", endpoint, err.Error())
		}
	}
	logger.Infof("sync to disk , [%d%%] complete\n", 100)

	if mode == "download" {
		compress.TarGz(fmt.Sprintf("%s%s", PERMANENCE_DIR, "db.tar.gz"), tmpDir)
	}

	//清空db目录
	if err = os.RemoveAll(finalDir); err != nil {
		return err
	}

	//将tmp目录改名为final
	if err = os.Rename(tmpDir, finalDir); err != nil {
		return err
	}

	return nil
}
