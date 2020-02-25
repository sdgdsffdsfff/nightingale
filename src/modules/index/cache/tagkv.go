package cache

import (
	"errors"
	"fmt"
	"sort"

	"github.com/toolkits/pkg/logger"
)

type TagPair struct {
	Key    string   `json:"key"`
	Values []string `json:"values"`
}

type XCludeList []*TagPair

// <-- 100/tag1=v1,tag2=v2
func (x *XCludeList) Include(tagMap map[string]string) bool {
	if len(tagMap) == 0 {
		return false
	}

	for _, tagPair := range *x {
		value, exists := tagMap[tagPair.Key]
		if !exists {
			return false
		}

		find := false
		for _, checkValue := range tagPair.Values {
			if checkValue == value {
				find = true
				break
			}
		}

		if !find {
			return false
		}
	}

	return true
}

func (x *XCludeList) Exclude(tagMap map[string]string) bool {
	if len(tagMap) == 0 {
		return true
	}

	for _, tagPair := range *x {
		if value, exists := tagMap[tagPair.Key]; exists {
			for _, checkValue := range tagPair.Values {
				if checkValue == value {
					return false
				}
			}
		}
	}

	return true
}

func (x *XCludeList) GetAllCombinationString() ([]string, error) {
	listLen := len(*x)
	newTags := make(XCludeList, listLen)
	tagsMap := make(map[string][]string)
	keys := make([]string, listLen)
	i := 0
	for _, tagPair := range *x {
		keys[i] = tagPair.Key
		tagsMap[tagPair.Key] = tagPair.Values
		i++
	}

	// check是否有相同的Key
	if len(keys) != len(tagsMap) {
		return []string{}, errors.New("the tagName must be unique")
	}

	sort.Strings(keys)

	for j, key := range keys {
		newTags[j] = &TagPair{Key: key, Values: tagsMap[key]}
	}
	return x.getAllCombinationComplex(newTags), nil
}

func (x *XCludeList) getAllCombinationComplex(tags XCludeList) []string {
	if len(tags) == 0 {
		return []string{}
	}
	firstStruct := tags[0]
	firstList := make([]string, len(firstStruct.Values))

	for i, v := range firstStruct.Values {
		firstList[i] = firstStruct.Key + "=" + v
	}

	otherList := x.getAllCombinationComplex(tags[1:])
	if len(otherList) == 0 {
		return firstList
	} else {
		toAlloc := len(otherList) * len(firstList)
		// hard code, 100W限制
		if toAlloc >= 1000000 {
			logger.Warningf("getAllCombinationComplex try to makearray with size:%d", toAlloc)
			logger.Warningf("getAllCombinationComplex input: %v", x)
		}
		retList := make([]string, len(otherList)*len(firstList))
		i := 0
		for _, firstV := range firstList {
			for _, otherV := range otherList {
				retList[i] = firstV + "," + otherV
				i++
			}
		}

		return retList
	}
}

//Check if can over limit
func (x *XCludeList) CheckFullMatch(limit int64) error {
	multiRes := int64(1)

	for _, tagPair := range *x {
		multiRes = multiRes * int64(len(tagPair.Values))
		if multiRes > limit {
			return fmt.Errorf("err too many tags")
		}
	}

	if multiRes == 0 {
		return fmt.Errorf("err empty tagk")
	}

	return nil
}
