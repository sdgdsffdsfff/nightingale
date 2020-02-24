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
	. "github.com/didi/nightingale/src/modules/index/config"
	"github.com/didi/nightingale/src/toolkits/address"
	"github.com/didi/nightingale/src/toolkits/compress"
)

var IndexDB *EndpointIndexMap

const PERMANENCE_DIR = "./.data/"

var semaPermanence = semaphore.NewSemaphore(1)

func InitDB() {
	IndexDB = &EndpointIndexMap{M: make(map[string]*MetricIndexMap, 0)}
}

func Rebuild() {
	fromRemote := false
	err := DownloadFile()
	if err == nil {
		dbFile := fmt.Sprintf("%s%s", PERMANENCE_DIR, "download")
		e := RebuildFromDisk(dbFile)
		if e != nil {
			logger.Errorf("build from %s err:%v", dbFile, e)
		} else {
			fromRemote = true
		}
	} else {
		logger.Errorf("build from remote err:%v", err)
	}

	if !fromRemote {
		RebuildFromDisk(fmt.Sprintf("%s%s", PERMANENCE_DIR, "db"))
	}
}

func RebuildFromDisk(permanDir string) error {
	logger.Info("Try to Rebuild index from Disk.")
	if !file.IsExist(permanDir) {
		return fmt.Errorf("Permanence_dir not exists.")
	}

	//遍历目录
	files, err := ioutil.ReadDir(permanDir)
	if err != nil {
		return err
	}
	logger.Infof("There're [%d] ns need rebuild", len(files))

	limit := 1
	if Config.RebuildWorker > 0 {
		limit = Config.RebuildWorker
	}

	concurrency := semaphore.NewSemaphore(limit)

	for _, fileObj := range files {
		if fileObj.IsDir() {
			continue
		}
		endpoint := fileObj.Name()

		concurrency.Acquire()
		go func(endpoint string) {
			defer concurrency.Release()

			body, err := ioutil.ReadFile(fmt.Sprintf("%s/%s", permanDir, endpoint))
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
	logger.Infof("rebuild from disk , [%d%%] complete\n", 100)
	return nil
}

func DownloadFile() error {
	filepath := fmt.Sprintf("db.tar.gz")
	var err error
	// Get the data
	activeIndexs := GetIndex()
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

func GetIndex() []*model.Idx {
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
			if index.Active && index.IP != Identity {
				activeIndexs = append(activeIndexs, index)
			}
		}
		return activeIndexs
	}
	return activeIndexs
}
