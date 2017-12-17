import bcryptjs from 'bcryptjs';

function _hash(str, callback) {
  bcryptjs.genSalt(10, (err, salt) => {
    if (err) {
      console.log(err);
      throw new Error(err);
    }

    bcryptjs.hash(str, salt, (err, hash) => {
      if (err) {
        console.log(err);
        throw new Error(err);
      }

      callback(hash);
    });
  });
}

/**
 * Module that creates one-way hashes that should be secure for hashing user passwords.
 */
const Digester = {
  // hashes a string and compares it with the input hash
  // invokes a callback with a boolean result as the only argument
  compare: (str, hash, cb) => {
    bcryptjs.compare(str, hash).then((res) => (cb(res)));
  },
  // hashes a string, invoking a callback with the hash as the only argument
  toHash: (str, cb) => {
    _hash(str, cb);
  }
};

export default Digester;