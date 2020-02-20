package config

const (
	VERSION         = "0.0.1"
	GAUGE           = "GAUGE"
	DERIVE          = "DERIVE"
	COUNTER         = "COUNTER"
	DEFAULT_STEP    = 60    //s
	MIN_STEP        = 30    //s
	FLUSH_MIN_COUNT = 6     //  flush counter to disk when its number of monitoring data greater than FLUSH_MIN_COUNT
	FLUSH_MAX_WAIT  = 86400 //s flush counter to disk if it not be flushed within FLUSH_MAX_WAIT seconds
)

const (
	ITEM_TO_SEND uint32 = 1 << iota
	ITEM_TO_PULLRRD
)
