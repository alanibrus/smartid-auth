const authHash = require(__dirname + '/authhash.js');
const SmartIDAuth = require(__dirname + '/index.js');
const smartauth = new SmartIDAuth({
  algorithm: 'SHA256',
  host: 'https://sid.demo.sk.ee/smart-id-rp/v1',
  requestParams: {
    relyingPartyUUID: '00000000-0000-0000-0000-000000000000',
    relyingPartyName: 'DEMO',
    certificateLevel: 'QUALIFIED'
  }
});

function _test(country, idNumber, expectedResult) {
  return new Promise((resolve, reject) => {
    const fail = (result) => {
      return reject({ country, idNumber, result });
    };
    const done = (result) => {
      return resolve({ country, idNumber, result });
    };

    // console.log('Running test for: ' + country + ' - ' + idNumber + '. Expected result is: ' + expectedResult);

    smartauth.authenticate(country, idNumber, 'Hello World').then(session => {
      if (!session.verificationCode) return fail('Did not get verificationCode');

      session.pollStatus().then(response => {
        if (response.result.endResult === expectedResult) {
          done(response.result);
        } else {
          fail(response.result.endResult);
        }
      }).catch(err => {
        if (err.message === expectedResult) {
          done(err.message);
        } else {
          fail(err.message);
        }
      });
    }).catch(err => {
      fail(err.message);
    });
  });
}


function _sign(docNumber, expectedResult) {
  return new Promise((resolve, reject) => {
    const fail = (result) => {
      return reject({ docNumber, expectedResult });
    };
    const done = (result) => {
      return resolve({ docNumber, expectedResult });
    };
    var result;


    authHash.generateRandomHash('SHA256').then(hash => {
      var digest = hash.digest;
      smartauth.sign(docNumber, digest, 'Signing!').then(session => {
        if (!session.verificationCode) {
          return fail('Did not get verificationCode');
        };

        session.pollStatusSigning().then(response => {
          if (response.result.endResult === expectedResult) {
            done(response.result);
          } else {
            fail(response.result.endResult);
          }
        }).catch(err => {
          if (err.message === expectedResult) {
            done(err.message);
          } else {
            fail(err.message);
          }
        });
      }).catch(err => {
        fail(err.message);
      });
    });
  });
}


Promise.all([
  _sign('PNOLV-010101-10006-SGT7-Q', 'OK'),
  _test('EE', '10101010005', 'OK'),
  _test('LV', '010101-10006', 'OK'),
  _test('LT', '10101010005', 'OK'),
  _test('EE', '10101010016', 'USER_REFUSED'),
  _test('LT', '10101010016', 'USER_REFUSED'),
]).then(results => {
  console.log('Tests OK! :)');
}).catch(e => {
  console.log('Tests failed :()');
});
