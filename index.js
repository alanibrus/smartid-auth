'use strict';
const config = require('./config.json');
const authHash = require('./authhash.js');
const request = require('request');
const crypto = require('crypto');
const x509 = require('x509');
const CERT_BEGIN = '-----BEGIN CERTIFICATE-----\n';
const CERT_END = '\n-----END CERTIFICATE-----';

class SmartIDAuth {
  constructor(idNumber, country = 'EE') {
    this.request = {
      idNumber: idNumber,
      country: country.toUpperCase()
    };
  }

  authenticate(displayText, callback) {
    if (typeof displayText === 'function') {
      callback = displayText;
    }

    authHash.generateRandomHash().then(hash => {
      this.request.hash = hash;
      request({
        method: 'POST',
        url: config.host + '/authentication/pno/' + this.request.country + '/' + this.request.idNumber,
        json: Object.assign(config.requestParams, {
          hash: hash.digest,
          hashType: 'SHA512',
          displayText: (typeof displayText === 'string' ? displayText : undefined)
        })
      }, (err, res, body) => {
        if (err || res.statusCode !== 200) {
          return callback(err || body);
        } else {
          if (typeof body !== 'object') {
            return callback('Invalid response');
          }
          this.session = {
            id: body.sessionID,
            verificationCode: authHash.calculateVerificationCode(hash.digest)
          };
          callback(null, this.session);
        }
      });
    });
  }

  pollStatus(callback) {
    const self = this;
    const pull = function(callback) {
      request({
        method: 'GET',
        json: true,
        url: config.host + '/session/'+ self.session.id + '?timeoutMs=10000'
      }, (err, res, body) => {
        if (err || res.statusCode !== 200) {
          return callback(err || body);
        } else {
          if (typeof body !== 'object') {
            return callback('Invalid response');
          }
          if (body.state !== 'COMPLETE') { // not completed yet, retry
            return pull(callback);
          } else {
            if (!body.result) {
              return callback('Invalid response (empty result)');
            } else if (body.result.endResult !== 'OK') {
              return callback(body.result.endResult);
            } else { // result.endResult = "OK"
              // verify signature:
              const verifier = crypto.createVerify(body.signature.algorithm);
              verifier.update(self.request.hash.raw);
              const cert = CERT_BEGIN + body.cert.value + CERT_END;
              if (!verifier.verify(cert, body.signature.value, 'base64')) {
                return callback('Invalid signature (verify failed)');
              }
              // check if cert is active and not expired:
              const parsedCert = x509.parseCert(cert);
              const date = new Date();
              if (parsedCert.notBefore > date) {
                return callback('Certificate is not active yet');
              } else if (parsedCert.notAfter < date) { 
                return callback('Certificate has expired');
              } else {
                callback(null, x509.getSubject(cert));
              }
            }
          }
        }
      });
    };
    pull(callback);
  }
}

module.exports = SmartIDAuth;
