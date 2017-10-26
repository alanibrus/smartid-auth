(function() {
  const usage = () => {
    return console.log('Usage: npm run demo [country] [idcode]. Example: npm run demo EE 12345678901');
  };

  if (!process.argv || process.argv.length !== 4) return usage();
  let idNumber = process.argv.pop();
  let country = process.argv.pop().toUpperCase();

  console.log('Running authentication for: ' + country + ' - ' + idNumber);

  const SmartIDAuth = require(__dirname + '/index.js');
  const smartauth = new SmartIDAuth({
    host: 'https://sid.demo.sk.ee/smart-id-rp/v1',
    requestParams: {
      relyingPartyUUID: '00000000-0000-0000-0000-000000000000',
      relyingPartyName: 'DEMO',
      certificateLevel: 'QUALIFIED'
    }
  });

  smartauth.authenticate(country, idNumber, 'Hello World').then(session => {
    // This is the verification code you should display to the user (on your site):
    console.log('Verification code: ' + session.verificationCode);
    console.log('Waiting for user action...');
    session.pollStatus().then(response => {
      console.log('Authentication OK!');
      console.log(response.data);
    }).catch(err => {
      console.error('Authentication error', err.message);
    });
  }).catch(err => {
    console.error('Error on initializing authentication', err.message);
  });
})();
