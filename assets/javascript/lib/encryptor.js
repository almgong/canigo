import { AES, enc } from 'crypto-js';

/**
 * Module that knows how to encrypt and decrypt arbitrary strings/plain text, such that
 * it is always able to retrieve the source string from a ciphertext, given
 * some key.
 */
export default class Encryptor {
  static encrypt(data, key) {
    return AES.encrypt(data, key);
  }

  static decrypt(cipher, key) {
    return AES.decrypt(cipher, key).toString(enc.Utf8);
  }
}