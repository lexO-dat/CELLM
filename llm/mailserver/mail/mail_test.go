package mail

import (
	"testing"

	"github.com/stretchr/testify/require"
)

const EMAIL_SENDER_NAME = "Portfolio"
const EMAIL_SENDER_ADRESS = "lucas.abello@mail.udp.cl"
const EMAIL_SENDER_PASSWORD = "wflxxpmrtdvnmhhm"

func TestNewGmailSender(t *testing.T) {

	sender := NewGmailSender(EMAIL_SENDER_NAME, EMAIL_SENDER_ADRESS, EMAIL_SENDER_PASSWORD)

	subject := "Test subject"

	content := `
	<h1>EXAMPLE</h1>
	<p>Hello world!</p>
	`

	to := []string{"lucas.abello@mail.udp.cl"}

	attachFiles := []string{"C:/Users/DELL G15/Documents/GitHub/Go-Email-Sender/test.txt"}

	err := sender.SendEmail(subject, content, to, nil, nil, attachFiles)

	require.NoError(t, err)

}
