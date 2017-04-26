# smartid-auth
Smart-ID authentication module for Node.JS

### WORK IN PROGRESS

```javascript
const SmartIDAuth = require('./index.js');

const smartauth = new SmartIDAuth('ESTONIAN-ID-CODE-GOES-HERE', 'EE');
smartauth.authenticate('MESSAGE-TO-DISPLAY-ON-PHONE-GOES-HERE', (err, sessionInfo) => {
  if (err) {
    return console.log('Error on initializing authentication', err);
  } else {
    console.log('Session started, waiting for user action...');
    console.log('Verification code: ' + sessionInfo.verificationCode);
    smartauth.pollStatus((err, response) => {
      if (err) {
        return console.log('Authentication error', err);
      } else {
        console.log('Authentication OK!');
        return console.log(response);
      }
    });
  }
});
```
