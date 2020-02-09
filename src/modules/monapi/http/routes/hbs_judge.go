package routes

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/toolkits/pkg/errors"
	"github.com/toolkits/pkg/logger"

	"github.com/didi/nightingale/src/model"
)

func judgeHeartBeat(c *gin.Context) {
	var rev model.Judge
	errors.Dangerous(c.ShouldBind(&rev))
	judge, err := model.GetJudgeByIpAndPort(rev.IP, rev.Port)
	errors.Dangerous(err)
	if judge == nil {
		judge = &model.Judge{
			IP:   rev.IP,
			Port: rev.Port,
			Ts:   time.Now().Unix(),
		}
		errors.Dangerous(judge.Add())
	} else {
		judge.Ts = time.Now().Unix()
		errors.Dangerous(judge.UpdateTS())
	}

	renderData(c, "ok", nil)
}

func judgeInstanceGets(c *gin.Context) {
	data, err := model.GetAllJudges()
	renderData(c, data, err)
}

type JudgesDelRev struct {
	Ids []int64 `json:"ids"`
}

func judgeInstanceDel(c *gin.Context) {
	username := loginUsername(c)
	if username != "root" {
		errors.Bomb("permission deny")
	}

	var rev JudgesDelRev
	errors.Dangerous(c.ShouldBind(&rev))
	for _, id := range rev.Ids {
		errors.Dangerous(model.DelJudgeById(id))
		logger.Infof("[judge] %s delete %+v", username, id)
	}
	renderData(c, "ok", nil)
}
