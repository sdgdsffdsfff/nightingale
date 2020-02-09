package dataobj

type NotifyMessage struct {
	Tos     []string `json:"tos"`
	Subject string   `json:"subject,omitempty"`
	Content string   `json:"content"`
	Type    string   `json:"type"`
}
