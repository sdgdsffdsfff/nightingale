package router

import (
	"net/http"
	"strings"

	"github.com/gorilla/mux"

	"github.com/didi/nightingale/src/modules/tsdb/http/render"
	"github.com/didi/nightingale/src/modules/tsdb/index"
)

func ConfigRoutes(r *mux.Router) {
	r.HandleFunc("/api/tsdb/ping", ping)
	r.HandleFunc("/api/tsdb/ver", ver)
	r.HandleFunc("/api/tsdb/addr", addr)
	r.HandleFunc("/api/tsdb/pid", pid)

	r.HandleFunc("/api/tsdb/get-item-by-series-id", getItemBySeriesID)
	r.HandleFunc("/api/tsdb/update-index", rebuildIndex)

	r.PathPrefix("/debug").Handler(http.DefaultServeMux)
}

func rebuildIndex(w http.ResponseWriter, r *http.Request) {
	go index.RebuildAllIndex()
	render.Data(w, "ok", nil)
}

func getItemBySeriesID(w http.ResponseWriter, r *http.Request) {
	seriesID, err := String(r, "series_id", "")
	if err != nil {
		render.Message(w, err)
		return
	}

	item := index.GetItemFronIndex(seriesID)
	render.Data(w, item, nil)
}

func String(r *http.Request, key string, defVal string) (string, error) {
	if val, ok := r.URL.Query()[key]; ok {
		if val[0] == "" {
			return defVal, nil
		}
		return strings.TrimSpace(val[0]), nil
	}

	if r.Form == nil {
		err := r.ParseForm()
		if err != nil {
			return "", err
		}
	}

	val := r.Form.Get(key)
	if val == "" {
		return defVal, nil
	}

	return strings.TrimSpace(val), nil
}
