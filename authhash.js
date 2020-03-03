const crypto = require('crypto');

class AuthHash {
  async generateRandomHash(hashType = 'sha512') {
    const buf = await this.getRandomBytes();
    return {
      raw: buf,
      digest: crypto
        .createHash(hashType)
        .update(buf)
        .digest('base64'),
    };
  }

  getRandomBytes() {
    return new Promise((resolve, reject) =>
      crypto.randomBytes(64, (err, buf) => {
        if (err) return reject(err);
        else resolve(buf);
      })
    );
  }

  calculateVerificationCode(rawHashInBase64) {
    // hash raw input with SHA256
    const sha256HashedInput = crypto
      .createHash('sha256')
      .update(Buffer.from(rawHashInBase64, 'base64'))
      .digest();
    // extract 2 rightmost bytes from it, interpret them as a big-endian unsigned integer
    const integer = sha256HashedInput.readUIntBE(
      sha256HashedInput.length - 2,
      2
    );
    // take the last 4 digits in decimal for display, padded with zeros from the left
    const verificationCode = String(
      '0000' + (integer % 10000).toString().substr(-4)
    ).slice(-4);

    return verificationCode;
  }
}

module.exports = new AuthHash();
