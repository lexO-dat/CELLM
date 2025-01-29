## Getting Started

To use this package, you'll need to obtain an application-specific password for the Gmail account you want to send emails from. This password is required for authentication when sending emails.

First init the mod:
```bash
go mod init mailserver && go mod tidy
```

### Obtaining Application-Specific Password

To obtain an application-specific password for Gmail:

1. Go to your sender gmail Account settings: [https://myaccount.google.com/](https://myaccount.google.com/)
2. Click on "Security" in the left sidebar.
3. You have to activate the two way factor
4. Go to the two way factor menu and search the application passwords
5. Then you have to create an application and copy the code, that is your password
