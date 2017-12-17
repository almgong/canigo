# canigo

## Description

A Chrome extension that periodically checks the route between an origin and a destination. Requires that the user input their Google Maps Directions API key. Because of the sensitivity of the required information, NO data is ever sent or stored anywhere in plaintext, with the exception of HTTP requests to the Google Maps API (which is over HTTPS in itself).

## State of Project

Currently, I believe that this project is unreleasable because of the limitations of security provided by Chrome's storage API (primarily the nonexistence of an encrypted store). However, the current solution is to implement a password/passphrase based encryption scheme using AES and bcrypt. The modules used are: [crypto-js](https://github.com/brix/crypto-js) and [bcryptjs](https://github.com/dcodeIO/bcrypt.js).

## Building

The usual:
```
npm install
```

There is a defined npm script to create a distribution directory of the extension (one that will need to be compiled to a .crx).

```
npm run dist
```

## Local development

One can load the unpacked extension via the Chrome extensions console. See: https://developer.chrome.com/extensions/getstarted#unpacked.

This project uses Webpack and Babel to transpile ES6 syntax and to resolve dependencies between files.

## License

MIT