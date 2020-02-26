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

			metricIndexMap, err := ReadIndexFromFile(indexFileDir, endpoint)
			if err != nil {
				logger.Errorf("read file error, [endpoint:%s][reason:%v]", endpoint, err)
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
	if mode == "end" {
		semaPermanence.Acquire()
		defer semaPermanence.Release()
	} else if mode == "normal" || mode == "download" {
		if !semaPermanence.TryAcquire() {
			return fmt.Errorf("permanence operate is Already running...")
		}
	} else {
		return fmt.Errorf("wrong mode:%v", mode)
	}

	var tmpDir string
	if mode == "download" {
		tmpDir = fmt.Sprintf("%s/%s", indexFileDir, "download")
	} else {
		tmpDir = fmt.Sprintf("%s/%s", indexFileDir, "tmp")
	}
	if err := os.RemoveAll(tmpDir); err != nil {
		return err
	}
	//创建tmp目录
	if err := os.MkdirAll(tmpDir, 0777); err != nil {
		return err
	}

	//填充tmp目录
	endpoints := IndexDB.GetEndpoints()
	logger.Infof("save index data to disk[num:%d][mode:%s]\n", len(endpoints), mode)

	for i, endpoint := range endpoints {
		logger.Infof("sync [%s] to disk, [%d%%] complete\n", endpoint, int((float64(i)/float64(len(endpoints)))*100))

		err := WriteIndexToFile(tmpDir, endpoint)
		if err != nil {
			logger.Errorf("write %s index to file err:%v", endpoint, err)
		}
	}

	logger.Infof("sync to disk , [%d%%] complete\n", 100)

	if mode == "download" {
		compress.TarGz(fmt.Sprintf("%s/%s", indexFileDir, "db.tar.gz"), tmpDir)
	}

	//清空旧的db目录
	oleIndexDir := fmt.Sprintf("%s/%s", indexFileDir, "db")
	if err := os.RemoveAll(oleIndexDir); err != nil {
		return err
	}
	//将tmp目录改名为正式的文件名
	if err := os.Rename(tmpDir, oleIndexDir); err != nil {
		return err
	}

	return nil
}

func WriteIndexToFile(indexDir, endpoint string) error {
	metricIndexMap, exists := IndexDB.GetMetricIndexMap(endpoint)
	if !exists || metricIndexMap == nil {
		return fmt.Errorf("endpoint index not found")
	}

	metricIndexMap.Lock()
	body, err := json.Marshal(metricIndexMap)
	metricIndexMap.Unlock()
	if err != nil {
		return fmt.Errorf("marshal struct to json failed:%v", err)
	}

	err = ioutil.WriteFile(fmt.Sprintf("%s/%s", indexDir, endpoint), body, 0666)
	return err
}

func ReadIndexFromFile(indexDir, endpoint string) (*MetricIndexMap, error) {
	metricIndexMap := new(MetricIndexMap)

	body, err := ioutil.ReadFile(fmt.Sprintf("%s/%s", indexDir, endpoint))
	if err != nil {
		return metricIndexMap, err
	}

	err = json.Unmarshal(body, metricIndexMap)
	return metricIndexMap, err
}

func getIndexFromRemote(identity string) error {
	filepath := fmt.Sprintf("db.tar.gz")
	var err error
	// Get the data
	activeIndexs := GetIndex(identity)
	perm := rand.Perm(len(activeIndexs))
	for i := range perm {
		url := fmt.Sprintf("http://%s:%s/api/index/idxfile", activeIndexs[perm[i]].IP, activeIndexs[perm[i]].HttpPort)
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
