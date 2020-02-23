package main

import (
	"bytes"
	"encoding/json"
	"io/ioutil"
	"log"
	"math/rand"
	"net/http"
	"time"
)

type MetricValue struct {
	Metric       string            `json:"metric"`
	Endpoint     string            `json:"endpoint"`
	Timestamp    int64             `json:"timestamp"`
	Step         int64             `json:"step"`
	ValueUntyped interface{}       `json:"value"`
	Value        float64           `json:"-"`
	CounterType  string            `json:"counterType"`
	Tags         string            `json:"tags"`
	TagsMap      map[string]string `json:"tagsMap"` //保留2种格式，方面后端组件使用
}

func main() {
	log.SetFlags(log.Ldate | log.Ltime | log.Lshortfile)

	t1 := time.NewTicker(10 * time.Second)
	for {
		url := "http://127.0.0.1:7900/api/transfer/push"
		resp, err := push(url, getMetricValues())
		if err != nil {
			log.Println(err)
		}
		log.Println(string(resp))
		<-t1.C
	}
}

func getMetricValues() []*MetricValue {
	ret := []*MetricValue{}
	now := time.Now().Unix()
	ts := now - now%10 // 对齐时间戳
	r1 := rand.Intn(20)
	tagsMap := make(map[string]string)

	ret = append(ret, &MetricValue{
		Endpoint:     "10.86.76.13",
		Metric:       "log.gateway.errMsg0",
		ValueUntyped: float64(1),
		Timestamp:    ts,
		CounterType:  "GAUGE",
		Step:         10,
		TagsMap:      tagsMap,
	})

	ret = append(ret, &MetricValue{
		Endpoint:     "10.86.76.13",
		Metric:       "qps",
		ValueUntyped: 9500 + rand.Intn(500),
		Timestamp:    ts,
		CounterType:  "GAUGE",
		Step:         10,
		TagsMap:      tagsMap,
	})
	log.Println("--->", ts, ret[0])
	return ret
}

func push(url string, v interface{}) (response []byte, err error) {
	bs, err := json.Marshal(v)
	if err != nil {
		return response, err
	}

	bf := bytes.NewBuffer(bs)

	resp, err := http.Post(url, "application/json", bf)
	if err != nil {
		return response, err
	}

	defer resp.Body.Close()
	return ioutil.ReadAll(resp.Body)

}
