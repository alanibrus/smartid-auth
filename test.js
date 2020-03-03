const SmartIDAuth = require('./index.js');
const smartauth = new SmartIDAuth({
  host: 'https://sid.demo.sk.ee/smart-id-rp/v1',
  requestParams: {
    relyingPartyUUID: '00000000-0000-0000-0000-000000000000',
    relyingPartyName: 'DEMO',
    certificateLevel: 'QUALIFIED',
  },
});

async function _test(country, idNumber, expectedResult) {
  const fail = result => {
    console.log(
      'FAIL',
      JSON.stringify({ country, idNumber, result, expectedResult })
    );
    throw new Error({ country, idNumber, result, expectedResult });
  };
  const done = result => {
    console.log('PASS', JSON.stringify({ country, idNumber, result }));
    return { country, idNumber, result };
  };

  console.log(
    `Running test for: ${country} - ${idNumber}. Expected result: ${expectedResult}`
  );

  try {
    const session = await smartauth.authenticate(
      country,
      idNumber,
      'Hello World'
    );
    if (!session.verificationCode) return fail('Did not get verificationCode');
    const response = await session.getResponse();
    if (response.result === expectedResult) {
      return done(response.result);
    } else {
      return fail(response.result);
    }
  } catch (err) {
    fail(err.message);
  }
}

Promise.all([
  _test('EE', '10101010005', 'OK'),
  _test('LV', '010101-10006', 'OK'),
  _test('LT', '10101010005', 'OK'),
  _test('EE', '10101010016', 'USER_REFUSED'),
  _test('LT', '10101010016', 'USER_REFUSED'),
])
  .then(results => {
    console.log('Tests OK! :)');
  })
  .catch(e => {
    console.log('Tests failed :(');
  });
