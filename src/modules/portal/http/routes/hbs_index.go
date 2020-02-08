package routes

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/toolkits/pkg/errors"
	"github.com/toolkits/pkg/logger"

	"github.com/didi/nightingale/src/model"
)

func indexHeartBeat(c *gin.Context) {
	var rev model.Idx
	errors.Dangerous(c.ShouldBind(&rev))
	index, err := model.GetIndexByIpAndPort(rev.IP, rev.RpcPort)
	errors.Dangerous(err)
	if index == nil {
		index = &model.Idx{
			IP:       rev.IP,
			RpcPort:  rev.RpcPort,
			HttpPort: rev.HttpPort,
			Ts:       time.Now().Unix(),
		}
		errors.Dangerous(index.Add())
	} else {
		index.Ts = time.Now().Unix()
		index.HttpPort = rev.HttpPort
		errors.Dangerous(index.Update())
	}

	renderData(c, "ok", nil)
}

func indexInstanceGets(c *gin.Context) {
	data, err := model.GetAllIndexs()
	renderData(c, data, err)
}

type indexDelRev struct {
	Ids []int64 `json:"ids"`
}

func indexInstanceDel(c *gin.Context) {
	username := loginUsername(c)
	if username != "root" {
		errors.Bomb("permission deny")
	}

	var rev indexDelRev
	errors.Dangerous(c.ShouldBind(&rev))
	for _, id := range rev.Ids {
		errors.Dangerous(model.DelIndexById(id))
		logger.Infof("[index] %s delete %+v", username, id)
	}
	renderData(c, "ok", nil)
}
