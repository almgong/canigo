import Digester from './digester';
import Encryptor from './encryptor';

/**
 * In memory storage for canigo that knows how to persist itself.
 */
export default class Storage {
  constructor(persistentStorageKey) {
    this.persistentStorageKey = persistentStorageKey;
    this._storage = this._initializeStorage();
  }

  _initializeStorage() {
    return {
      apiKey: null,
      passphrase: null,
      route: {
        origin: null,
        destination: null
      }
    };
  }

  _generateEncryptedStorage() {
    const encryptedStorage = this._initializeStorage();

    // hash passphrase first
    return new Promise((res, rej) => {
      Digester.toHash(this._storage.passphrase, (passphraseHash) => {
        encryptedStorage.apiKey = Encryptor.encrypt(this._storage.apiKey, this._storage.passphrase);
        encryptedStorage.passphrase = passphraseHash;
        encryptedStorage.route.origin = Encryptor.encrypt(this._storage.route.origin, this._storage.passphrase);
        encryptedStorage.route.destination = Encryptor.encrypt(this._storage.route.destination, this._storage.passphrase);

        res(encryptedStorage);
      });
    });
  }

  // returns a promise resolving to a decrypted store that resembles the input store 
  // used to encrypt encryptedStorage
  // assumes passphrase is the same as the one used to encrypt
  _generateDecryptedStorage(encryptedStorage, passphrase) {
    return new Promise((res, rej) => {
      const decryptedStorage = {
        route: {}
      };

      decryptedStorage.apiKey = Encryptor.decrypt(encryptedStorage.apiKey, passphrase);
      decryptedStorage.passphrase = passphrase;
      decryptedStorage.route.origin = Encryptor.decrypt(encryptedStorage.route.origin, passphrase);
      decryptedStorage.route.destination = Encryptor.decrypt(encryptedStorage.route.destination, passphrase);

      res(decryptedStorage);
    });
  }

  setStorage(storage) {
    // hacky for now to allow instances to affect storage without having to define multiple getters/setters
    this._storage = storage;
  }

  getStorageAsObject() {
    return this._storage;
  }

  /**
   * Persists the storage to chrome storage. By default the storage is encrypted with
   * a passphrase, and that passphrase is in turn hashed before persisting.
   *
   * @return {Promise} a JS Promise that indicates when the storing is complete.
   */
  persist() {
    return new Promise((res, rej) => {
      this._generateEncryptedStorage().then((encrypted) => {
        const entry = {};
        entry[this.persistentStorageKey] = encrypted;

        chrome.storage.sync.set(entry, () => {
          chrome.runtime.lastError ? rej(chrome.runtime.lastError) : res(null);
        });
      }).catch((reason) => {
        console.log('Failed to encrypt storage: ' + reason);
      });
    });
  }

  /**
   * Retrieves the encrypted storage based on the specified persistentStorageKey passed
   * during initialization.
   * @param  {string} passphrase the passphrase specified in a previous persist() call. If not specified,
   *                             the storage object returned will not be decrypted. If incorrect, the 
   *                             returned promise will be rejected
   * @return {Promise}           a Promise object that either resolves with (en)crypted data depending on
   *                               whether passphrase is present and correct, or reject with some error.
   */
  retrievePersistedStorage(passphrase) {
    return new Promise((res, rej) => {

      if (passphrase) {
        chrome.storage.sync.get(this.persistentStorageKey, (items) => {
          if (chrome.runtime.lastError) {
            rej(chrome.runtime.lastError);
            return;
          }

          // if the passphrase is correct, resolve to data
          if (Object.keys(items).length > 0 && items[this.persistentStorageKey].passphrase) {
            const persistedStorage = items[this.persistentStorageKey];

            Digester.compare(passphrase, persistedStorage.passphrase, (passphraseMatches) => {
              if (passphraseMatches) {
                this._generateDecryptedStorage(persistedStorage, passphrase).then((decryptedStorage) => {
                  res(decryptedStorage);
                });
              } else {  // passphrase is WRONG, reject
                rej('Invalid passphrase.');
              }
            });
          } else {
            rej('No existing persistent storage.');
          }
        });
      } else {
        // For now we won't handle case where a passphrase is not present
        throw new Error('Unimplemented retrievePersistedStorage(undefined)');
      }
    });
  }

  /**
   * Destroys any persisted data, but does not affect the in-memory storage.
   *
   * @return {Promise} a Promise that resolves with no arguments on success, or rejects with
   *                     error.
   */
  clear() {
    return new Promise((res, rej) => {
      chrome.storage.sync.remove(this.persistentStorageKey, () => {
        chrome.runtime.lastError ? rej(chrome.runtime.lastError) : res(null);
      });
    });
  }
}