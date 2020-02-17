package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/toolkits/pkg/errors"
	"github.com/toolkits/pkg/logger"

	"github.com/didi/nightingale/src/model"
	"github.com/didi/nightingale/src/modules/monapi/scache"
)

func straPost(c *gin.Context) {
	me := loginUser(c)
	stra := new(model.Stra)
	errors.Dangerous(c.ShouldBind(stra))

	stra.Creator = me.Username
	stra.LastUpdator = me.Username

	errors.Dangerous(stra.Encode())

	oldStra, _ := model.StraGet("name", stra.Name)
	if oldStra != nil && oldStra.Nid == stra.Nid {
		errors.Bomb("同节点下策略名称 %s 已存在", stra.Name)
	}

	errors.Dangerous(stra.Save())

	type Id struct {
		Id int64 `json:"id"`
	}
	id := Id{Id: stra.Id}

	renderData(c, id, nil)
}

func straPut(c *gin.Context) {
	me := loginUser(c)

	stra := new(model.Stra)
	errors.Dangerous(c.ShouldBind(stra))

	stra.LastUpdator = me.Username
	errors.Dangerous(stra.Encode())

	oldStra, _ := model.StraGet("name", stra.Name)
	if oldStra != nil && oldStra.Id != stra.Id && oldStra.Nid == stra.Nid {
		errors.Bomb("同节点下策略名称 %s 已存在", stra.Name)
	}

	s, err := model.StraGet("id", stra.Id)
	errors.Dangerous(err)
	stra.Creator = s.Creator

	errors.Dangerous(stra.Update())

	logger.Info("put--->>> ", stra.NotifyUser, stra.NotifyUserStr)
	renderData(c, "ok", nil)
}

type StrasDelRev struct {
	Ids []int64 `json:"ids"`
}

func strasDel(c *gin.Context) {
	var rev StrasDelRev
	errors.Dangerous(c.ShouldBind(&rev))

	for i := 0; i < len(rev.Ids); i++ {
		errors.Dangerous(model.StraDel(rev.Ids[i]))
	}

	renderData(c, "ok", nil)
}

func straGet(c *gin.Context) {
	sid := urlParamInt64(c, "sid")

	stra, err := model.StraGet("id", sid)
	errors.Dangerous(err)
	if stra == nil {
		errors.Bomb("stra not found")
	}

	err = stra.Decode()
	errors.Dangerous(err)

	renderData(c, stra, nil)
}

func strasGet(c *gin.Context) {
	name := queryStr(c, "name", "")
	priority := queryInt(c, "priority", 4)
	nid := queryInt64(c, "nid", 0)
	list, err := model.StrasList(name, priority, nid)
	logger.Info("get--->>>")
	for i := 0; i < len(list); i++ {
		logger.Info("user: ", list[i].NotifyUser, list[i].NotifyUserStr)
	}
	renderData(c, list, err)
}

func strasAll(c *gin.Context) {
	list, err := model.StrasAll()
	renderData(c, list, err)
}

func effectiveStrasGet(c *gin.Context) {
	instance := mustQueryStr(c, "instance")
	node, err := scache.JudgeActiveNode.GetNodeBy(instance)
	errors.Dangerous(err)

	stras := scache.StraCache.GetByNode(node)
	renderData(c, stras, nil)
}
