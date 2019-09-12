'use strict';
const authHash = require(__dirname + '/authhash.js');
const axios = require('axios');
const crypto = require('crypto');
const x509 = require('@ghaiklor/x509');
const CERT_BEGIN = '-----BEGIN CERTIFICATE-----\n';
const CERT_END = '\n-----END CERTIFICATE-----';

class Session {
  constructor(config, request, id, verificationCode) {
    this.config = config;
    this._request = request;
    this.id = id;
    this.verificationCode = verificationCode;
  }

  pollStatus() {
    return new Promise((resolve, reject) => {
      const pull = () => {
        axios({
          method: 'GET',
          responseType: 'json',
          validateStatus: (status) => status === 200,
          url: this.config.host + '/session/'+ this.id + '?timeoutMs=10000'
        }).then(response => {
          let body = response.data;
          if (typeof body !== 'object') {
            return reject(new Error('Invalid response'));
          }
          if (body.state && body.state !== 'COMPLETE') { // not completed yet, retry
            return setTimeout(pull.bind(this), 100);
          } else {
            if (!body.result) {
              return reject(new Error('Invalid response (empty result)'));
            } else if (body.result.endResult !== 'OK') {
              return reject(new Error(body.result.endResult));
            } else { // result.endResult = "OK"
              // verify signature:
              const verifier = crypto.createVerify(body.signature.algorithm);
              verifier.update(this._request.hash.raw);
              const cert = CERT_BEGIN + body.cert.value + CERT_END;
              if (!verifier.verify(cert, body.signature.value, 'base64')) {
                return reject(new Error('Invalid signature (verify failed)'));
              }
              // check if cert is active and not expired:
              const parsedCert = x509.parseCert(cert);
              const date = new Date();
              if (parsedCert.notBefore > date) {
                return reject(new Error('Certificate is not active yet'));
              } else if (parsedCert.notAfter < date) { 
                return reject(new Error('Certificate has expired'));
              } else {
                return resolve({ data: x509.getSubject(cert), result: body.result });
              }
            }
          }
        }).catch(err => reject(new Error(err)))
      };
      pull();
    });
  }
}

class Authentication {
  constructor(config, country, idNumber) {
    this.config = config;
    this.request = {
      idNumber: idNumber,
      country: country.toUpperCase()
    };
  }

  authenticate(displayText) {
    return new Promise((resolve, reject) => {
      authHash.generateRandomHash().then(hash => {
        this.request.hash = hash;
        axios({
          method: 'post',
          url: this.config.host + '/authentication/pno/' + this.request.country + '/' + this.request.idNumber,
          responseType: 'json',
          validateStatus: (status) => status === 200,
          data: Object.assign({
            hash: hash.digest,
            hashType: 'SHA512',
            displayText: (typeof displayText === 'string' ? displayText : undefined)
          }, this.config.requestParams)
        }).then(response => {
          let body = response.data;
          if (typeof body !== 'object' || !body.sessionID) {
            return reject(new Error('Invalid response'));
          }
          resolve(new Session(this.config, this.request, body.sessionID, authHash.calculateVerificationCode(hash.digest)));
        }).catch(err => reject(new Error(err)));
      });
    });
  }
}

class SmartID {
  constructor(config) {
    if (!config.host || !config.requestParams) throw new TypeError('Invalid configuration');

    this.config = config;
  }

  authenticate(country, idNumber, displayText) {
    if (!country || !idNumber) throw new TypeError('Missing mandatory parameters');

    let auth = new Authentication(this.config, country, idNumber);
    return auth.authenticate(displayText);
  }
}

module.exports = SmartID;
