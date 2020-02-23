package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math/rand"
	"net"
	"net/rpc"
	"reflect"
	"runtime"
	"time"

	"github.com/toolkits/pkg/concurrent/semaphore"
	"github.com/ugorji/go/codec"
)

type TsdbItem struct {
	Endpoint  string            `json:"endpoint"`
	Metric    string            `json:"metric"`
	Tags      string            `json:"tags"`
	TagsMap   map[string]string `json:"tagsMap"`
	Value     float64           `json:"value"`
	Timestamp int64             `json:"timestamp"`
	DsType    string            `json:"dstype"`
	Step      int               `json:"step"`
	Heartbeat int               `json:"heartbeat"`
	Min       string            `json:"min"`
	Max       string            `json:"max"`
}

type SimpleRpcResponse struct {
	Code int `json:"code"`
}

func (this *SimpleRpcResponse) String() string {
	return fmt.Sprintf("<Code: %d>", this.Code)
}

type TsdbQueryParam struct {
	Start     int64  `json:"start"`
	End       int64  `json:"end"`
	RRA       int64  `json:"rra_step"`
	Step      int64  `json:"step"`
	ConsolFun string `json:"consolFuc"`
	Endpoint  string `json:"endpoint"`
	Counter   string `json:"counter"`
}

type TsdbQueryResponse struct {
	Endpoint string     `json:"endpoint"`
	Counter  string     `json:"counter"`
	DsType   string     `json:"dstype"`
	Step     int        `json:"step"`
	Values   []*RRDData `json:"Values"` //大写为了兼容已经再用这个api的用户
}

func (resp *TsdbQueryResponse) String() string {
	bytes, err := json.Marshal(resp)
	if err != nil {
		return err.Error()
	}
	return string(bytes)
}

type RRDData struct {
	Timestamp int64   `json:"timestamp"`
	Value     float64 `json:"value"`
}

func main() {
	runtime.GOMAXPROCS(runtime.NumCPU())
	client := getRpcClient()

	sema := semaphore.NewSemaphore(100)
	t1 := time.NewTicker(time.Duration(10) * time.Second)
	log.Println("begin...")
	for {
		<-t1.C
		for i := 0; i < 1; i++ {
			endpoint := fmt.Sprintf("endpoint.%d", i)
			for j := 0; j < 5000; j++ {
				metric := fmt.Sprintf("metric.%d", j)
				sema.Acquire()
				go func(endpoint, metric string) {
					defer sema.Release()
					items := getTsdbItems(endpoint, metric)
					//log.Println(items[0])
					resp := &SimpleRpcResponse{}
					start := time.Now().UnixNano()
					err := client.Call("Tsdb.Send", items, resp)
					if err != nil {
						fmt.Println("err:", err)
					} else {
						//fmt.Println("resp:", resp)
					}
					log.Println((time.Now().UnixNano() - start) / 1000000)
				}(endpoint, metric)

			}
		}
		log.Println("push..")
		//time.Sleep(10 * time.Second)
	}
	client.Close()
}

// 允许上报历史数据
func getTsdbItems(endpoint, metric string) []*TsdbItem {
	ret := []*TsdbItem{}
	now := time.Now().Unix()
	ts := now - now%10 // 对齐时间戳
	r1 := rand.Intn(100)

	l := rand.Intn(6) * 100
	if l == 0 {
		l = 100
	}

	for i := 0; i < 100; i++ {
		ret = append(ret, &TsdbItem{
			Endpoint: endpoint,
			Metric:   metric,
			TagsMap: map[string]string{
				"errno": fmt.Sprintf("tsdb.%d", i),
			},
			Value:     float64(r1),
			Timestamp: ts,
			DsType:    "GAUGE",
			Step:      10,
			Min:       "U",
			Max:       "U",
		})
	}
	return ret
}

func getRpcClient() *rpc.Client {
	var mh codec.MsgpackHandle
	mh.MapType = reflect.TypeOf(map[string]interface{}(nil))

	conn, err := net.DialTimeout("tcp", "10.86.76.13:8047", time.Millisecond*500)
	if err != nil {
		log.Fatalln(err)
	}

	var bufconn = struct { // bufconn here is a buffered io.ReadWriteCloser
		io.Closer
		*bufio.Reader
		*bufio.Writer
	}{conn, bufio.NewReader(conn), bufio.NewWriter(conn)}

	rpcCodec := codec.MsgpackSpecRpc.ClientCodec(bufconn, &mh)
	client := rpc.NewClientWithCodec(rpcCodec)
	return client
}
