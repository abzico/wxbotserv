# wxbotserv

An automated Wechat bot to reply message for normal user account that run on server-side. Yes, you heard it right, on server-side.

# How-To

## Environment variables

Use environment variables to customize how the bot will work.

* `SLACK_WEBHOOK_URL=<your slack webhook url>`

	Bot will send QRCode image to Slack. Then you can use WeChat to scan in order to log in immediately. Please note that you cannot send image to WeChat and extract QRCode from there. __It needs actual scan.__

## Start the Bot!

Import the bot, and start it as follows

```javascript
const wxbotserv = require('wxbotserv');
wxbotserv();
```

Or you can specify `options` which can be

```javascript
{
	processMsgDelay: <number>, // delay between each processing message
	debugLog: <boolean> // whether or not to print out debugging log to console
}
```

# Project Status

- [x] notify QR Code image to Slack channel
- [ ] notify QR Code image to WeChat Official / Subscription account that has permission to send template message
- [x] support plain text message as response back from bot
- [ ] support more type of message (image, etc) as response back from bot 

# License

[MIT](https://github.com/haxpor/wxbotserv/blob/master/LICENSE), Wasin Thonkaew, [abzi.co](https://abzi.co)