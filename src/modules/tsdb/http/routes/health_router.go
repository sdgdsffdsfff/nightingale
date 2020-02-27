package routes

import (
	"fmt"
	"net/http"
	"os"

	"github.com/didi/nightingale/src/modules/tsdb/config"
)

func ping(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "pong")
}

func ver(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, config.VERSION)
}

func addr(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, r.RemoteAddr)
}

func pid(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, fmt.Sprintf("%d", os.Getpid()))
}
