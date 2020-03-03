# Smart-ID authentication client module for Node.JS

## Install
`npm install smartid-auth`

## Trying out with Demo
1. [Download SmartID Demo app for Android](https://play.google.com/store/apps/details?id=com.stagnationlab.sk&ah=a4HzglGscCO-V56s6FlAj3ty7Aw)
2. Set up your demo app in your phone
3. `cd node_modules/smartid-auth/`
4. `npm run demo [countrycode EE/LT/LV] [Personal-ID-Number]`
Example: `npm run demo EE 12345678901`

## Usage
Documentation is in progress, refer to the examples below

### Initializing with configuration
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
```

### Usage Example 1 - Session resolves only when successful result (OK) from Smart-ID service:
When you only care about successful Smart-ID login and you're going to show only "Login failed" no matter what happened.
In this example, you don't need to worry about checking the result status yourself.

```javascript
try {
  const session = await smartauth.authenticate(
    'EE', // country
    '12345678901', // personal ID number
    'Hello World' // message to display on Smart-ID mobile app
  );

  // This is the verification code you should display to the user (i.e. on your website):
  console.log('Verification code: ' + session.verificationCode);

  console.log('Waiting for user action...');

  // getResponse(true) = only "OK" session end result code is valid, all other cases throw error
  const response = await session.getResponse(true);
  console.log('Authentication OK!');
  // full Smart-ID response:
  console.log(response.data);
  // Certificate subject (name, country, id number):
  console.log(response.subject);
} catch (err) {
  console.error('Authentication failed');
  console.error(err);
}
```

### Usage Example 2 - Session resolves with any result (OK, USER_REFUSED, TIMEOUT, etc):
When you need more customization depending on actual end result. For example, to be able to show why login failed.
In this example you need to check the end result yourself and decide what to do in each case.

```javascript
try {
  const session = await smartauth.authenticate(
    'EE', // country
    '12345678901', // personal ID number
    'Hello World' // message to display on Smart-ID mobile app
  );

  // This is the verification code you should display to the user (i.e. on your website):
  console.log('Verification code: ' + session.verificationCode);

  console.log('Waiting for user action...');

  // getResponse(false) = all session end result codes are returned
  const response = await session.getResponse();
  // full Smart-ID response:
  console.log(response.data);

  if (response.result === 'OK') {
    console.log('Authentication OK!');
    // Certificate subject (name, country, id number):
    console.log(response.subject);
  } else {
    console.log('Authentication failed!:');
    switch (response.result) {
      case 'USER_REFUSED':
        console.error('User refused the request');
        break;
      case 'TIMEOUT':
        console.error('Authentication request timed out');
        break;
      case 'DOCUMENT_UNUSABLE':
        console.error('Request cannot be completed');
        break;
      case 'WRONG_VC':
        console.error('User chose wrong verification code');
        break;
      default:
        console.error(`Unknown result: ${response.result}`);
    }
  }
} catch (err) {
  console.error('Authentication error');
  console.error(err);
}
```

## Session response object (result of session.getResponse)
```
{
  result: String, one of: 'OK' / 'USER_REFUSED' / 'TIMEOUT', 'DOCUMENT_UNUSABLE', 'WRONG_VC',
  data: Object, Raw response from Smart-ID service (https://github.com/SK-EID/smart-id-documentation/blob/master/README.md#464-response-structure),
  subject: Object, x509 certificate subject field { countryName, surName, givenName, serialNumber, commonName }
}
```

## Output example

```
$ npm run demo EE 10101010005
Verification code: 8865
Waiting for user action...
Authentication OK!
{ countryName: 'EE',
  surname: 'SMART-ID',
  givenName: 'DEMO',
  serialNumber: 'PNOEE-10101010005',
  commonName: 'SMART-ID,DEMO,PNOEE-10101010005',
  organizationalUnitName: 'AUTHENTICATION' }
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
