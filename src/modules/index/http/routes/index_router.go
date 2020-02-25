package routes

import (
	"fmt"

	"github.com/didi/nightingale/src/modules/index/cache"

	"github.com/gin-gonic/gin"
	"github.com/toolkits/pkg/errors"
	"github.com/toolkits/pkg/logger"
)

type EndpointsRecv struct {
	Endpoints []string `json:"endpoints"`
}

type EndpointMetricList struct {
	Metrics []string `json:"metrics"`
}

func GetMetricsByEndpoint(c *gin.Context) {
	recv := EndpointsRecv{}
	errors.Dangerous(c.ShouldBindJSON(&recv))

	m := make(map[string]struct{})
	resp := EndpointMetricList{}
	for _, endpoint := range recv.Endpoints {
		metrics := cache.IndexDB.GetMetricsBy(endpoint)
		for _, metric := range metrics {
			if _, exists := m[metric]; !exists {
				m[metric] = struct{}{}
				resp.Metrics = append(resp.Metrics, metric)
			}
		}
	}

	renderData(c, resp, nil)
}

type EndpointMetricRecv struct {
	Endpoints []string `json:"endpoints"`
	Metrics   []string `json:"metrics"`
}

func DeleteMetrics(c *gin.Context) {
	recv := EndpointMetricRecv{}
	errors.Dangerous(c.ShouldBindJSON(&recv))

	for _, endpoint := range recv.Endpoints {
		if metricIndexMap, exists := cache.IndexDB.GetMetricIndexMap(endpoint); exists {
			for _, metric := range recv.Metrics {
				metricIndexMap.CleanMetric(metric)
			}
		}
	}

	renderData(c, "ok", nil)
}

type IndexTagkvResp struct {
	Endpoints []string         `json:"endpoints"`
	Metric    string           `json:"metric"`
	Tagkv     []*cache.TagPair `json:"tagkv"`
}

func DeleteCounter(c *gin.Context) {
	recv := IndexTagkvResp{}
	errors.Dangerous(c.ShouldBindJSON(&recv))

	for _, endpoint := range recv.Endpoints {
		metricIndexMap, exists := cache.IndexDB.GetMetricIndexMap(endpoint)
		if !exists {
			continue
		}

		tagkvMap, exists := metricIndexMap.GetMetricIndexTagkvMap(recv.Metric)
		if !exists {
			continue
		}

		for _, tagPair := range recv.Tagkv {
			for _, v := range tagPair.Values {
				tagkvMap.DelTagkv(tagPair.Key, v)
			}
		}
	}

	renderData(c, "ok", nil)
}

func GetTagkvByEndpoint(c *gin.Context) {
	recv := EndpointMetricRecv{}
	errors.Dangerous(c.ShouldBindJSON(&recv))

	resp := []*IndexTagkvResp{}

	tagkvFilter := make(map[string]map[string]struct{})

	for _, metric := range recv.Metrics {
		tagkvs := []*cache.TagPair{}

		for _, endpoint := range recv.Endpoints {
			metricIndexMap, exists := cache.IndexDB.GetMetricIndexMap(endpoint)
			if !exists {
				logger.Debugf("index not found by %s", endpoint)
				continue
			}

			tagkvIndex, exists := metricIndexMap.GetMetricIndexTagkvMap(metric)
			if !exists {
				logger.Debugf("index not found by %s %s", endpoint, metric)
				continue
			}

			tagkvMap := tagkvIndex.GetTagkvMap()
			for tagk, tagvs := range tagkvMap {
				tagvFilter, exists := tagkvFilter[tagk]
				if !exists {
					tagvFilter = make(map[string]struct{})
				}

				for _, tagv := range tagvs {
					if _, exists := tagvFilter[tagv]; !exists {
						tagvFilter[tagv] = struct{}{}
					}
				}

				tagkvFilter[tagk] = tagvFilter
			}
		}

		for tagk, tagvFilter := range tagkvFilter {
			tagvs := []string{}
			for v, _ := range tagvFilter {
				tagvs = append(tagvs, v)
			}
			tagkv := &cache.TagPair{
				Key:    tagk,
				Values: tagvs,
			}
			tagkvs = append(tagkvs, tagkv)
		}

		TagkvResp := IndexTagkvResp{
			Endpoints: recv.Endpoints,
			Metric:    metric,
			Tagkv:     tagkvs,
		}
		resp = append(resp, &TagkvResp)
	}
	renderData(c, resp, nil)
}

type FullmatchByEndpointRecv struct {
	Endpoints []string         `json:"endpoints"`
	Metric    string           `json:"metric"`
	Tagkv     []*cache.TagPair `json:"tagkv"`
}

type FullmatchByEndpointResp struct {
	Endpoints []string `json:"endpoints"`
	Metric    string   `json:"metric"`
	Tags      []string `json:"tags"`
	Step      int      `json:"step"`
	DsType    string   `json:"dstype"`
}

func FullmatchByEndpoint(c *gin.Context) {
	recv := []FullmatchByEndpointRecv{}
	errors.Dangerous(c.ShouldBindJSON(&recv))

	tagFilter := make(map[string]struct{})
	tagsList := []string{}

	var resp []FullmatchByEndpointResp

	for _, r := range recv {
		metric := r.Metric
		tagkv := r.Tagkv
		step := 0
		dsType := ""

		for _, endpoint := range r.Endpoints {
			if endpoint == "" {
				logger.Debugf("非法请求: endpoint字段缺失:%v", r)
				continue
			}
			if metric == "" {
				logger.Debugf("非法请求: metric字段缺失:%v", r)
				continue
			}
			metricIndexMap, exists := cache.IndexDB.GetMetricIndexMap(endpoint)
			if !exists {
				logger.Debugf("not found metrics by endpoint:%s", endpoint)
				continue
			}
			if step == 0 || dsType == "" {
				step, dsType, exists = metricIndexMap.GetStepAndDstype(metric)
				if !exists {
					logger.Debugf("not found step by endpoint:%s metric:%v\n", endpoint, metric)
					continue
				}
			}

			countersIndex, exists := metricIndexMap.GetMetricIndexCounters(metric)
			if !exists {
				logger.Debugf("not found counters by endpoint:%s metric:%v\n", endpoint, metric)
				continue
			}

			countersMap := countersIndex.GetCounters()

			tags, err := cache.IndexDB.QueryCountersFullMatchByTags(endpoint, metric, tagkv)
			if err != nil {
				logger.Warning(err)
				continue
			}

			for _, tag := range tags {
				//校验和tag有关的counter是否存在，如果一个指标，比如port.listen有name=uic,port=8056和name=hsp,port=8002。避免产生4个曲线
				if _, exists := countersMap[tag]; !exists {
					logger.Debugf("not found counters byendpoint:%s metric:%v tags:%v\n", endpoint, metric, tag)
					continue
				}

				if _, exists := tagFilter[tag]; !exists {
					tagsList = append(tagsList, tag)
					tagFilter[tag] = struct{}{}
				}
			}
		}

		resp = append(resp, FullmatchByEndpointResp{
			Endpoints: r.Endpoints,
			Metric:    r.Metric,
			Tags:      tagsList,
			Step:      step,
			DsType:    dsType,
		})
	}

	renderData(c, resp, nil)
}

type CludeByEndpointRecv struct {
	Endpoints []string         `json:"endpoints"`
	Metric    string           `json:"metric"`
	Include   cache.XCludeList `json:"include"`
	Exclude   cache.XCludeList `json:"exclude"`
}

type XcludeResp struct {
	Endpoint string   `json:"endpoint"`
	Metric   string   `json:"metric"`
	Tags     []string `json:"tags"`
	Step     int      `json:"step"`
	DsType   string   `json:"dstype"`
}

func CludeByEndpoint(c *gin.Context) {
	recv := []CludeByEndpointRecv{}
	errors.Dangerous(c.ShouldBindJSON(&recv))

	tagFilter := make(map[string]struct{})
	tagList := []string{}
	var resp []XcludeResp

	for _, r := range recv {
		metric := r.Metric
		includeList := r.Include
		excludeList := r.Exclude
		step := 0
		dsType := ""

		for _, endpoint := range r.Endpoints {
			if endpoint == "" {
				logger.Debugf("非法请求: endpoint字段缺失:%v", r)
				continue
			}
			if metric == "" {
				logger.Debugf("非法请求: metric字段缺失:%v", r)
				continue
			}

			metricIndexMap, exists := cache.IndexDB.GetMetricIndexMap(endpoint)
			if !exists {
				resp = append(resp, XcludeResp{
					Endpoint: endpoint,
					Metric:   metric,
					Tags:     tagList,
					Step:     step,
					DsType:   dsType,
				})
				logger.Debugf("not found metrics by endpoint:%s", endpoint)
				continue
			}

			if step == 0 || dsType == "" {
				step, dsType, exists = metricIndexMap.GetStepAndDstype(metric)
				if !exists {
					resp = append(resp, XcludeResp{
						Endpoint: endpoint,
						Metric:   metric,
						Tags:     tagList,
						Step:     step,
						DsType:   dsType,
					})

					logger.Debugf("not found step by endpoint:%s metric:%v\n", endpoint, metric)
					continue
				}
			}

			metricIndex, exists := metricIndexMap.GetMetricIndex(metric)
			if !exists {
				logger.Debugf("not found step by endpoint:%s metric:%v\n", endpoint, metric)
				continue
			}

			//校验实际tag组合成的counter是否存在，如果一个指标，比如port.listen有name=uic,port=8056和name=hsp,port=8002。避免产生4个曲线
			counterMap := metricIndex.CounterMap.GetCounters()

			tags := []string{}
			var err error
			if len(includeList) == 0 && len(excludeList) == 0 {
				for counter, _ := range counterMap {
					tags = append(tags, counter)
				}
			} else {
				tags, err = cache.IndexDB.QueryCountersByXclude(endpoint, metric, includeList, excludeList)
				if err != nil {
					logger.Warning(err)
					continue
				}
			}

			for _, tag := range tags {
				if tag == "" { //过滤掉空字符串
					continue
				}

				//校验实际tag组合成的counter是否存在，如果一个指标，比如port.listen有name=uic,port=8056和name=hsp,port=8002。避免产生4个曲线
				if _, exists := counterMap[tag]; !exists {
					logger.Debugf("not found counters by endpoint:%s metric:%v tags:%v\n", endpoint, metric, tag)
					continue
				}

				if _, exists := tagFilter[tag]; !exists {
					tagList = append(tagList, tag)
					tagFilter[tag] = struct{}{}
				}
			}

			resp = append(resp, XcludeResp{
				Endpoint: endpoint,
				Metric:   metric,
				Tags:     tagList,
				Step:     step,
				DsType:   dsType,
			})
		}
	}

	renderData(c, resp, nil)
}

func DumpIndex(c *gin.Context) {
	err := cache.IndexDB.Persist("normal")
	errors.Dangerous(err)

	renderData(c, "ok", nil)
}

func DumpFile(c *gin.Context) {
	err := cache.IndexDB.Persist("download")
	errors.Dangerous(err)

	traGz := fmt.Sprintf("%s%s", cache.PERMANENCE_DIR, "db.tar.gz")
	c.File(traGz)
}
