package config

var (
	PointIn          int64 = 0
	PointInErr       int64 = 0
	QueryCount       int64 = 0
	QueryUnHit       int64 = 0
	FlushRRDCount    int64 = 0
	FlushRRDErrCount int64 = 0
	PushIndex        int64 = 0
	PushIncrIndex    int64 = 0
	PushIndexErr     int64 = 0
	OldIndex         int64 = 0

	ToOldTsdb int64 = 0
	ToNewTsdb int64 = 0
)
