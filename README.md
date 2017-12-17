# canigo

## Description

A Chrome extension that periodically checks the route between an origin and a destination. Requires that the user input their Google Maps Directions API key. Because of the sensitivity of the required information, NO data is ever sent or stored anywhere in plaintext, with the exception of HTTP requests to the Google Maps API (which is over HTTPS in itself).

## State of Project

Currently this is unreleasable because of limitations of security provided by Chrome's storage API (it's nonexistence and the storage quota size). However, the structure is there in case there ever is an encrypted storage option AND/OR if I have the time to come up with a different solution.

## Building

The usual:
```
npm install
```

A defined npm script exists to create a distribution directory of the extension (one that will need to be compiled to a .crx).

```
npm run dist
```

This project uses Webpack and Babel to transpile ES6 syntax and to resolve dependencies between files.

## License

MIT