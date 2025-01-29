package mail

import (
	"fmt"
	"net/smtp"
	"github.com/jordan-wright/email"
)

const (
	smtpAuthAdress = "smtp.gmail.com"
	smtpServerAuth = "smtp.gmail.com:587"
)

type EmailSender interface {
	SendEmail(
		subject string,
		body string,
		to []string,
		cc []string,
		bcc []string,
		attachFiles []string,
	) error
}

type GmailSender struct {
	name              string
	fromEmailAdress   string
	fromEmailPassword string
}

func NewGmailSender(name string, fromEmailAdress string, fromEmailPassword string) EmailSender {
	return &GmailSender{
		name:              name,
		fromEmailAdress:   fromEmailAdress,
		fromEmailPassword: fromEmailPassword,
	}
}

func (sender *GmailSender) SendEmail(
	subject string,
	body string,
	to []string,
	cc []string,
	bcc []string,
	attachFiles []string,
) error {
	e := email.NewEmail()
	e.From = fmt.Sprintf("%s <%s>", sender.name, sender.fromEmailAdress)
	e.Subject = subject
	e.HTML = []byte(body)
	e.To = to
	e.Cc = cc
	e.Bcc = bcc

	for _, f := range attachFiles {
		_, err := e.AttachFile(f)
		if err != nil {
			return fmt.Errorf("error attaching file: %s", err)
		}
	}

	smptpAuth := smtp.PlainAuth("", sender.fromEmailAdress, sender.fromEmailPassword, smtpAuthAdress)

	return e.Send(smtpServerAuth, smptpAuth)

}
