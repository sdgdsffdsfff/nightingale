package middleware

import (
	"encoding/base64"
	"fmt"
	"strings"

	"github.com/didi/nightingale/src/model"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"github.com/toolkits/pkg/errors"
)

func Logined() gin.HandlerFunc {
	return func(c *gin.Context) {
		fmt.Println("in Logined()")
		username := cookieUser(c)
		if username == "" {
			fmt.Println("in Logined(): after cookieUser: username == blank")
			username = headerUser(c)
			fmt.Println("in Logined(): after headerUser: username=", username)
		}

		if username == "" {
			errors.Bomb("unauthorized")
		}

		c.Set("username", username)
		c.Next()
	}
}

func cookieUser(c *gin.Context) string {
	session := sessions.Default(c)

	value := session.Get("username")
	if value == nil {
		return ""
	}

	return value.(string)
}

func headerUser(c *gin.Context) string {
	auth := c.GetHeader("Authorization")

	if auth == "" {
		return ""
	}

	arr := strings.Fields(auth)
	if len(arr) != 2 {
		return ""
	}

	identity, err := base64.StdEncoding.DecodeString(arr[1])
	if err != nil {
		return ""
	}

	pair := strings.Split(string(identity), ":")
	if len(pair) != 2 {
		return ""
	}

	err = model.PassLogin(pair[0], pair[1])
	if err != nil {
		return ""
	}

	return pair[0]
}

const internalToken = "monapi-builtin-token"

// CheckHeaderToken check thirdparty x-srv-token
func CheckHeaderToken() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := c.GetHeader("x-srv-token")
		if token != internalToken {
			errors.Bomb("token[%s] invalid", token)
		}
		c.Next()
	}
}
