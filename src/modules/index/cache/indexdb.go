package cache

import (
	"encoding/json"
	"fmt"
	"io"
	"io/ioutil"
	"math/rand"
	"net/http"
	"os"
	"time"

	"github.com/toolkits/pkg/concurrent/semaphore"
	"github.com/toolkits/pkg/file"
	"github.com/toolkits/pkg/logger"
	"github.com/toolkits/pkg/net/httplib"

	"github.com/didi/nightingale/src/model"
	"github.com/didi/nightingale/src/toolkits/address"
	"github.com/didi/nightingale/src/toolkits/compress"
)

var IndexDB *EndpointIndexMap

var semaPermanence = semaphore.NewSemaphore(1)

func InitDB() {
	IndexDB = &EndpointIndexMap{M: make(map[string]*MetricIndexMap, 0)}
}

func Rebuild(persistenceDir string, concurrency int, identity string) {
	var dbDir string
	err := getIndexFromRemote(identity)
	if err == nil {
		dbDir = fmt.Sprintf("%s/%s", persistenceDir, "download")
	} else {
		logger.Errorf("build from remote err:%v, rebuild from local", err)

		dbDir = fmt.Sprintf("%s/%s", persistenceDir, "db")
	}

	err = RebuildFromDisk(dbDir, concurrency)
	if err != nil {
		logger.Error(err)
	}
}

func RebuildFromDisk(indexFileDir string, concurrency int) error {
	logger.Info("Try to rebuild index from disk")
	if !file.IsExist(indexFileDir) {
		return fmt.Errorf("index persistence dir not exists.")
	}

	//遍历目录
	files, err := ioutil.ReadDir(indexFileDir)
	if err != nil {
		return err
	}
	logger.Infof("There're [%d] endpoints need rebuild", len(files))

	sema := semaphore.NewSemaphore(concurrency)
	for _, fileObj := range files {
		if fileObj.IsDir() {
			continue
		}
		endpoint := fileObj.Name()

		sema.Acquire()
		go func(endpoint string) {
			defer sema.Release()

			body, err := ioutil.ReadFile(fmt.Sprintf("%s/%s", indexFileDir, endpoint))
			if err != nil {
				logger.Errorf("read file error, [endpoint:%s][reason:%v]", endpoint, err)
				return
			}

			metricIndexMap := new(MetricIndexMap)
			err = json.Unmarshal(body, metricIndexMap)
			if err != nil {
				logger.Errorf("json unmarshal failed, [endpoint:%s][reason:%v]", endpoint, err)
				return
			}

			IndexDB.Lock()
			IndexDB.M[endpoint] = metricIndexMap
			IndexDB.Unlock()
		}(endpoint)

	}
	logger.Infof("rebuild from disk done")
	return nil
}

func Persist(mode string, indexFileDir string) error {
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
		tmpDir = fmt.Sprintf("%s%s", indexFileDir, "download")
	} else {
		tmpDir = fmt.Sprintf("%s%s", indexFileDir, "tmp")
	}

	finalDir := fmt.Sprintf("%s%s", indexFileDir, "db")

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
	endpoints := IndexDB.GetEndpoints()
	logger.Infof("now start to save index data to disk...[ns-num:%d][mode:%s]\n", len(endpoints), mode)

	for i, endpoint := range endpoints {

		logger.Infof("sync [%s] to disk, [%d%%] complete\n", endpoint, int((float64(i)/float64(len(endpoints)))*100))
		metricIndexMap, exists := IndexDB.GetMetricIndexMap(endpoint)
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
		compress.TarGz(fmt.Sprintf("%s%s", indexFileDir, "db.tar.gz"), tmpDir)
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

func getIndexFromRemote(identity string) error {
	filepath := fmt.Sprintf("db.tar.gz")
	var err error
	// Get the data
	activeIndexs := GetIndex(identity)
	perm := rand.Perm(len(activeIndexs))
	for i := range perm {
		url := fmt.Sprintf("http://%s:%s/api/index/dumpfile", activeIndexs[perm[i]].IP, activeIndexs[perm[i]].HttpPort)
		resp, err := http.Get(url)
		if err != nil {
			return err
		}
		defer resp.Body.Close()

		// Create the file
		out, err := os.Create(filepath)
		if err != nil {
			return err
		}
		defer out.Close()
		// Write the body to file
		_, err = io.Copy(out, resp.Body)
	}

	compress.UnTarGz(filepath, ".")
	if err != nil {
		return err
	}
	//清空db目录
	if err = os.Remove(filepath); err != nil {
		return err
	}

	return err
}

type indexRes struct {
	Err string       `json:"err"`
	Dat []*model.Idx `json:"dat"`
}

func GetIndex(identity string) []*model.Idx {
	addrs := address.GetHTTPAddresses("monapi")
	perm := rand.Perm(len(addrs))
	activeIndexs := []*model.Idx{}

	var body indexRes

	for i := range perm {
		url := fmt.Sprintf("http://%s/api/hbs/indexs", addrs[perm[i]])
		err := httplib.Get(url).SetTimeout(3 * time.Second).ToJSON(&body)

		if err != nil {
			logger.Warningf("curl %s fail: %v", url, err)
			continue
		}

		if body.Err != "" {
			logger.Warningf("curl %s fail: %v", url, body.Err)
			continue
		}

		for _, index := range body.Dat {
			if index.Active && index.IP != identity {
				activeIndexs = append(activeIndexs, index)
			}
		}
		return activeIndexs
	}
	return activeIndexs
}
