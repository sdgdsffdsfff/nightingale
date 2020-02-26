package config

import "errors"

const Version = 1

var (
	ErrNidNotFound          = errors.New("cannot find this nid")
	ErrNidMetricNotFound    = errors.New("cannot find this metric in target nid")
	ErrNidMetricTagNotFound = errors.New("cannot find this tagkey in target nid & metric")
	ErrDupTagName           = errors.New("the tagName must be unique")
	ErrTooManyTags          = errors.New("too many tags")
	ErrEmptyTagk            = errors.New("empty tagk")
)

var (
	RpcPort  = ""
	HttpPort = ""
)
