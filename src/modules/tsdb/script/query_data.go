package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/rpc"
	"reflect"
	"runtime"
	"time"

	"github.com/toolkits/pkg/concurrent/semaphore"

	"github.com/ugorji/go/codec"
)

type TsdbQueryParam struct {
	Start      int64  `json:"start"`
	End        int64  `json:"end"`
	ConsolFunc string `json:"consolFunc"`
	Endpoint   string `json:"endpoint"`
	Counter    string `json:"counter"`
	Step       int    `json:"step"`
	DsType     string `json:"dsType"`
}

type TsdbQueryResponse struct {
	Start    int64      `json:"start"`
	End      int64      `json:"end"`
	Endpoint string     `json:"endpoint"`
	Counter  string     `json:"counter"`
	DsType   string     `json:"dstype"`
	Step     int        `json:"step"`
	Values   []*RRDData `json:"values"`
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
	client := getRpcClient()
	queryBatch()

	for {
		data := &TsdbQueryResponse{}
		req := TsdbQueryParam{
			Start:      time.Now().Unix() - 30000,
			End:        time.Now().Unix(),
			Step:       10,
			ConsolFunc: "AVERAGE",
			DsType:     "GAUGE",
			Endpoint:   "endpoint.1",
			Counter:    "metric.300/service=tsdb.1",
		}
		log.Println("req:", req)
		err := client.Call("Tsdb.Query", req, data)
		if err != nil {
			fmt.Println(err)
		} else {
			fmt.Printf("data: %s\n", data)
		}
		time.Sleep(10 * time.Second)
	}
}

func queryBatch() {
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
					req := TsdbQueryParam{
						Start:      time.Now().Unix() - 300,
						End:        time.Now().Unix(),
						Step:       10,
						ConsolFunc: "AVERAGE",
						DsType:     "GAUGE",
						Endpoint:   endpoint,
						Counter:    metric + "/service=tsdb.1",
					}
					data := &TsdbQueryResponse{}
					log.Println("req:", req)
					err := client.Call("Tsdb.Query", req, data)
					if err != nil {
						fmt.Println(err)
					} else {
						fmt.Printf("data: %s\n", data)
					}
				}(endpoint, metric)

			}
		}
		log.Println("push..")
		//time.Sleep(10 * time.Second)
	}
	client.Close()
}

func getRpcClient() *rpc.Client {
	var mh codec.MsgpackHandle
	mh.MapType = reflect.TypeOf(map[string]interface{}(nil))

	conn, err := net.DialTimeout("tcp", "10.86.76.13:8047", time.Millisecond*3000)
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
