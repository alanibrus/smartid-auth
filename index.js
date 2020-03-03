const axios = require('axios');
const crypto = require('crypto');
const x509 = require('@ghaiklor/x509');

const authHash = require('./authhash.js');

const CERT_BEGIN = '-----BEGIN CERTIFICATE-----\n';
const CERT_END = '\n-----END CERTIFICATE-----';

function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class Session {
  constructor(config, request, id, verificationCode) {
    this.config = config;
    this._request = request;
    this.id = id;
    this.verificationCode = verificationCode;
  }

  async getResponse(rejectNotOK) {
    let response;
    try {
      response = await axios({
        method: 'GET',
        responseType: 'json',
        validateStatus: status => status === 200,
        url: this.config.host + '/session/' + this.id + '?timeoutMs=10000',
      });
    } catch (err) {
      response = err.response;
    }

    const body = response && response.data;
    if (typeof body !== 'object') {
      throw new Error(`Invalid response: ${body}`);
    } else if (!body.state && !body.result) {
      throw new Error(`Invalid response: ${JSON.stringify(body)}`);
    } else if (body.state && body.state !== 'COMPLETE') {
      // not completed yet, retry after 100ms
      await timeout(100);
      await this.getResponse(rejectNotOK);
    } else {
      if (body.result.endResult !== 'OK') {
        if (rejectNotOK) {
          throw new Error(`Invalid result: ${body.result.endResult}`);
        } else {
          return {
            result: body.result.endResult,
            data: body,
          };
        }
      } else {
        // result.endResult = "OK"
        // verify signature:
        const verifier = crypto.createVerify(body.signature.algorithm);
        verifier.update(this._request.hash.raw);
        const cert = CERT_BEGIN + body.cert.value + CERT_END;
        if (!verifier.verify(cert, body.signature.value, 'base64')) {
          throw new Error('Invalid signature (verify failed)');
        }
        // check if cert is active and not expired:
        const parsedCert = x509.parseCert(cert);
        const date = new Date();
        if (parsedCert.notBefore > date) {
          throw new Error('Certificate is not active yet');
        } else if (parsedCert.notAfter < date) {
          throw new Error('Certificate has expired');
        } else {
          return {
            result: body.result.endResult,
            subject: x509.getSubject(cert),
            data: body,
          };
        }
      }
    }
  }
}

class Authentication {
  constructor(config, country, idNumber) {
    this.config = config;
    this.request = {
      idNumber: idNumber,
      country: country.toUpperCase(),
    };
  }

  async authenticate(displayText) {
    const hash = await authHash.generateRandomHash();
    this.request.hash = hash;
    let response;
    try {
      response = await axios({
        method: 'post',
        url:
          this.config.host +
          '/authentication/pno/' +
          this.request.country +
          '/' +
          this.request.idNumber,
        responseType: 'json',
        validateStatus: status => status === 200,
        data: Object.assign(
          {
            hash: hash.digest,
            hashType: 'SHA512',
            displayText:
              typeof displayText === 'string' ? displayText : undefined,
          },
          this.config.requestParams
        ),
      });
    } catch (err) {
      response = err.response;
    }
    const body = response && response.data;
    if (typeof body !== 'object' || !body.sessionID) {
      throw new Error(`Invalid response: ${JSON.stringify(body)}`);
    }

    return new Session(
      this.config,
      this.request,
      body.sessionID,
      authHash.calculateVerificationCode(hash.digest)
    );
  }
}

class SmartID {
  constructor(config) {
    if (!config.host || !config.requestParams)
      throw new TypeError('Invalid configuration');

    this.config = config;
  }

  async authenticate(country, idNumber, displayText) {
    if (!country || !idNumber)
      throw new TypeError('Missing mandatory parameters');

    const auth = new Authentication(this.config, country, idNumber);
    const response = await auth.authenticate(displayText);
    return response;
  }
}

module.exports = SmartID;
