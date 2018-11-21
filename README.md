# Smart-ID authentication client module for Node.JS

*N.B!* Difference between original [repo](https://github.com/alanibrus/smartid-auth) is that it returns the `sha256` of the users cert in the response.

## Install
`npm install smartid-auth`

## Trying out with Demo
1. [Download SmartID Demo app for Android](https://play.google.com/store/apps/details?id=com.stagnationlab.sk&ah=a4HzglGscCO-V56s6FlAj3ty7Aw)
2. Set up your demo app in your phone
3. `cd node_modules/smartid-auth/`
4. `npm run demo [countrycode EE/LT/LV] [Personal-ID-Number]`
Example: `npm run demo EE 12345678901`

## Usage
Documentation is in progress, refer to the example below:

```javascript
const SmartIDAuth = require('smartid-auth');
const smartauth = new SmartIDAuth({
  host: 'https://sid.demo.sk.ee/smart-id-rp/v1',
  requestParams: {
    relyingPartyUUID: '00000000-0000-0000-0000-000000000000',
    relyingPartyName: 'DEMO',
    certificateLevel: 'QUALIFIED'
  }
});

smartauth.authenticate('EE', 'ESTONIAN-ID-CODE-GOES-HERE', 'MESSAGE-TO-DISPLAY-ON-PHONE-GOES-HERE').then(session => {
  // This is the verification code you should display to the user (on your site):
  console.log('Verification code: ' + session.verificationCode);
  console.log('Waiting for user action...');
  session.pollStatus().then(response => {
    console.log('Authentication OK!');
    console.log(response);
  }).catch(err => {
    console.error('Authentication error', err);
  });
}).catch(err => {
  console.error('Error on initializing authentication', err);
});
```

## Demo output example

```
$ npm run demo EE 10101010005
Verification code: 8865
Waiting for user action...
Authentication OK!
{
  data: {
    countryName: 'EE',
    surname: 'SMART-ID',
    givenName: 'DEMO',
    serialNumber: 'PNOEE-10101010005',
    commonName: 'SMART-ID,DEMO,PNOEE-10101010005',
    organizationalUnitName: 'AUTHENTICATION'
  },
  result: {
    endResult: "OK"
    documentNumber: "PNOEE-10101010005-G3DD-Q"
  },
  certSha: "381ebbe4dba5f4f0125199e9371ebb379c8c7ab25eda49e5a63dc3a9d084c7a5"
}
```

## Running tests

Smart-ID provides test accounts for automated testing.
Running `npm run test` will go through those:

|  EndResult | Country | national-identity-number | certificateLevel |
|---|---|---|---|
| OK | EE | 10101010005  | QUALIFIED |
| OK | LV | 010101-10006 | QUALIFIED |
| OK | LT | 10101010005  | QUALIFIED |
| USER_REFUSED | EE | 10101010016 | QUALIFIED |
| USER_REFUSED | LT | 10101010016 | QUALIFIED |
