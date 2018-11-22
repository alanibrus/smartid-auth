'use strict';
const authHash = require(__dirname + '/authhash.js');
const axios = require('axios');
const crypto = require('crypto');
const x509 = require('x509');
const CERT_BEGIN = '-----BEGIN CERTIFICATE-----\n';
const CERT_END = '\n-----END CERTIFICATE-----';


class Authentication {
  constructor(config, country, idNumber) {
    this.config = config;
    this.request = {
      idNumber: idNumber,
      country: country.toUpperCase()
    };
  }

  async authenticate(displayText) {
    try {
      const hash = await authHash.generateRandomHash();
      this.request.hash = hash;

      const response = await axios({
        method: 'post',
        url: `${this.config.host}/authentication/pno/${this.request.country}/${this.request.idNumber}`,
        responseType: 'json',
        validateStatus: (status) => status === 200,
        data: Object.assign({
          hash: hash.digest,
          hashType: 'SHA512',
          displayText: (typeof displayText === 'string' ? displayText : undefined)
        }, this.config.requestParams)
      });

      let body = response.data;
      if (typeof body !== 'object' || !body.sessionID) {
        throw new Error('Invalid response');
      }

      return {
        config: this.config,
        hash: this.request.hash,
        id: body.sessionID,
        verificationCode: authHash.calculateVerificationCode(hash.digest)
      }

    } catch (err) {
      throw new Error(err);
    }
  }
}


class Signing {
  constructor(config, documentNumber, hashToSign = null) {
    this.config = config;
    this.request = {
      documentNumber: documentNumber,
    };
    this.hashToSign = hashToSign;
  }

  async sign(displayText) {
    try {
      let hash;
      if (!this.hashToSign) {
        hash = await authHash.generateRandomHash();
      } else {
        hash = this.hashToSign;
      }
      this.request.hash = hash;

      const response = await axios({
        method: 'post',
        url: this.config.host + '/signature/document/' + this.request.documentNumber,
        responseType: 'json',
        validateStatus: (status) => status === 200,
        data: Object.assign({
          hash: hash.digest,
          hashType: 'SHA512',
          displayText: (typeof displayText === 'string' ? displayText : undefined)
        }, this.config.requestParams)
      });

      let body = response.data;
      if (typeof body !== 'object' || !body.sessionID) {
        throw new Error('Invalid response');
      }

      return {
        config: this.config,
        hash: this.request.hash,
        id: body.sessionID,
        verificationCode: authHash.calculateVerificationCode(hash.digest)
      }
    } catch (err) {
      throw new Error(err);
    }
  }
}


class Session {
  constructor(config, id, hash) {
    this.config = config;
    this.hash = hash;
    this.id = id;
  }

  async pollStatus() {
    const pull = async () => {
      try {
        const response = await axios({
          method: 'GET',
          responseType: 'json',
          validateStatus: (status) => status === 200,
          url: this.config.host + '/session/'+ this.id + '?timeoutMs=10000'
        });

        let body = response.data;

        if (typeof body !== 'object') {
          throw new Error('Invalid response');
        }

        // Not completed yet, retry
        if (body.state && body.state !== 'COMPLETE') {
          return setTimeout(pull.bind(this), 100);
        }

        // Validate the result
        if (!body.result) {
          throw new Error('Invalid response (empty result)');
        } else if (body.result.endResult !== 'OK') {
          throw new Error(body.result.endResult);
        }

        // Verify signature
        const verifier = crypto.createVerify(body.signature.algorithm);
        verifier.update(this.hash);
        const cert = CERT_BEGIN + body.cert.value + CERT_END;
        if (!verifier.verify(cert, body.signature.value, 'base64')) {
          throw new Error('Invalid signature (verify failed)');
        }

        // Check if cert is active and not expired
        const parsedCert = x509.parseCert(cert);
        const date = new Date();
        if (parsedCert.notBefore > date) {
          throw new Error('Certificate is not active yet');

        } else if (parsedCert.notAfter < date) {
          throw new Error('Certificate has expired');

        } else {
          return {
            data: x509.getSubject(cert),
            result: body.result,
            signature: body.signature,
          };
        }

      } catch(err) {
        throw new Error(err);
      };
    };

    return await pull();
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


  poll(sessionId, hash) {
    if (!sessionId || !hash) throw new TypeError('Missing mandatory parameters');

    hash = Buffer.from(hash, 'hex');
    let poll = new Session(this.config, sessionId, hash);
    return poll.pollStatus();
  }


  signing(documentNumber, hashToSign = null) {
    if (!documentNumber) throw new TypeError('Missing mandatory parameters');

    if (hashToSign) {
      const buf = Buffer.from(hashToSign, 'hex');
      hashToSign = {
        raw: buf,
        digest: crypto.createHash('sha512').update(buf).digest('base64'),
      };
    }

    let sign = new Signing(this.config, documentNumber, hashToSign);
    const displayText = 'Create your personalised encryption key on Lahdes';
    return sign.sign(displayText);
  }
}


module.exports = SmartID;
