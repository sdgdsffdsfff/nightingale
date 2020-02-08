package model

import "time"

type Judge struct {
	Id     int64  `json:"id"`
	IP     string `json:"ip" xorm:"ip"`
	Port   string `json:"port"`
	Ts     int64  `json:"ts"`
	Active bool   `xorm:"-" json:"active"`
}

func (j *Judge) Add() error {
	_, err := DB["hbs"].InsertOne(j)
	return err
}

func (j *Judge) UpdateTS() error {
	_, err := DB["hbs"].Where("id=?", j.Id).Cols("ts").Update(j)
	return err
}

func (j *Judge) UpdateById() error {
	_, err := DB["hbs"].Where("id=?", j.Id).Cols("ip", "port", "ts").Update(j)
	return err
}

func GetJudgeByIpAndPort(ip, port string) (*Judge, error) {
	var obj Judge
	has, err := DB["hbs"].Where("ip=? and port = ?", ip, port).Get(&obj)
	if err != nil {
		return nil, err
	}

	if !has {
		return nil, nil
	}

	return &obj, nil
}

func GetAllJudges() ([]*Judge, error) {
	objs := make([]*Judge, 0)
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

func DelJudgeById(id int64) error {
	_, err := DB["hbs"].Where("id=?", id).Delete(new(Judge))
	return err
}
