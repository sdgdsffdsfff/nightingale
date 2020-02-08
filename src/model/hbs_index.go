package model

import "time"

type Idx struct {
	Id       int64  `json:"id"`
	IP       string `json:"ip" xorm:"ip"`
	RpcPort  string `json:"rpc_port"`
	HttpPort string `json:"http_port"`
	Ts       int64  `json:"ts"`
	Active   bool   `xorm:"-" json:"active"`
}

func (j *Idx) Add() error {
	_, err := DB["hbs"].InsertOne(j)
	return err
}

func (j *Idx) Update() error {
	_, err := DB["hbs"].Where("id=?", j.Id).MustCols("ts", "http_port").Update(j)
	return err
}

func GetIndexByIpAndPort(ip, port string) (*Idx, error) {
	var obj Idx
	has, err := DB["hbs"].Where("ip=? and rpc_port = ?", ip, port).Get(&obj)
	if err != nil {
		return nil, err
	}

	if !has {
		return nil, nil
	}

	return &obj, nil
}

func GetAllIndexs() ([]*Idx, error) {
	objs := make([]*Idx, 0)
	err := DB["hbs"].Find(&objs)
	if err != nil {
		return objs, err
	}
	now := time.Now().Unix()
	for _, j := range objs {
		if j.Ts > now-60 { //上报心跳时间在1分钟之内
			j.Active = true
		}
	}
	return objs, err
}

func DelIndexById(id int64) error {
	_, err := DB["hbs"].Where("id=?", id).Delete(new(Idx))
	return err
}
