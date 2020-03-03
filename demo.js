(async function() {
  const usage = () => {
    return console.log(
      'Usage: npm run demo [country] [idcode]. Example: npm run demo EE 12345678901'
    );
  };

  if (!process.argv || process.argv.length !== 4) return usage();
  let idNumber = process.argv.pop();
  let country = process.argv.pop().toUpperCase();

  console.log('Running authentication for: ' + country + ' - ' + idNumber);

  const SmartIDAuth = require('./index.js');
  const smartauth = new SmartIDAuth({
    host: 'https://sid.demo.sk.ee/smart-id-rp/v1',
    requestParams: {
      relyingPartyUUID: '00000000-0000-0000-0000-000000000000',
      relyingPartyName: 'DEMO',
      certificateLevel: 'QUALIFIED',
    },
  });

  try {
    const session = await smartauth.authenticate(
      country,
      idNumber,
      'Hello World'
    );
    // This is the verification code you should display to the user (on your site):
    console.log('Verification code: ' + session.verificationCode);
    console.log('Waiting for user action...');

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
})();
