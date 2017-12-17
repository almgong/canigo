import RequestMessage from './lib/request-message';
import Storage from './lib/storage';

/**
 * Event page for canigo, handling network requests, encryption, core business logic, etc.
 *
 * One extra thing this event page does is update the extension icon as necessary.
 */

// constants
const GOOGLE_MAPS_ENDPOINT = 'https://maps.googleapis.com/maps/api/directions/json';
const ALARM_KEY = 'canigoRouteCheckAlarm';
const ALARM_INTERVAL_MINUTES = 10;  // perhaps in the future, we will allow users to customize this
const STORAGE_KEY = 'canigoKey';    // key to retrieve storage
const imagesPath = 'assets/images';
const carGreyPath = `${imagesPath}/car-gray.png`;
const carGreenPath = `${imagesPath}/car-green.png`;
const carOrangePath = `${imagesPath}/car-orange.png`;
const carRedPath = `${imagesPath}/car-red.png`;

// in memory storage and state for event page
const storage = new Storage(STORAGE_KEY);
const state = {
  running: false,
  lastTrafficDurationResult: null,
  lastChecked: null
};

// sets alarm to periodically wake this event page to do work (if any)
// interval is in units of minutes
function setAlarm(interval) {
  chrome.alarms.create(ALARM_KEY, {
    delayInMinutes: interval, // fire onAlarm again in <interval> minutes
    periodInMinutes: interval // fire onAlarm every <interval> minutes thereafter
  });
}

// stops any alarms
function clearAlarm() {
  chrome.alarms.clear(ALARM_KEY);
}

function setIconWithColor(color) {
  let iconPath;
  switch(color) {
    case 'GREY':
      iconPath = carGreyPath;
      break;
    case 'RED':
      iconPath = carRedPath;
      break;
    case 'ORANGE':
      iconPath = carOrangePath;
      break;
    case 'GREEN':
      iconPath = carGreenPath;
      break;
    default:
      // no-op

  }

  if (iconPath) {
    chrome.browserAction.setIcon({
      path: iconPath
    });
  }
}

// returns an object with form: { estimatedTrafficDuration: <Number>, estimatedRouteDuration: <Number> }
// each value is in units of minutes
function getEstimatedRouteData(legs) {
  let duration = 0;           // Google's average travel time for this route
  let durationInTraffic = 0;  // the actual travel time for this route if we left now

  legs.forEach((leg) => {
    // convert seconds to minutes
    duration += (leg.duration.value / 60);
    durationInTraffic += (leg.duration_in_traffic.value / 60);
  });

  return {
    estimatedTimeSpentInTraffic: durationInTraffic - duration,
    estimatedRouteDuration: duration
  };
}

function handleGoogleMapsDirectionsData(data) {
  const routeData = getEstimatedRouteData(data.routes[0].legs);
  const { estimatedTimeSpentInTraffic, estimatedRouteDuration } = routeData;

  // we decide on status based on the proportion of traffic to route time
  if (estimatedTimeSpentInTraffic / estimatedRouteDuration > .3) {
    // RED, lot's of traffic
    setIconWithColor('RED');
  } else if (estimatedTimeSpentInTraffic / estimatedRouteDuration > .2) {
    // ORANGE, moderate traffic
    setIconWithColor('ORANGE');
  } else {
    // GREEN, little to no traffic
    setIconWithColor('GREEN');
  }

  state.lastTrafficDurationResult = estimatedTimeSpentInTraffic;
  state.lastChecked = new Date().toString();
}

function makeRouteRequest() {
  const storageAsObj = storage.getStorageAsObject();
  const params = `key=${storageAsObj.apiKey}&origin=${storageAsObj.route.origin}&destination=${storageAsObj.route.destination}&mode=driving&avoid=tolls&departure_time=now`
  const url = `${GOOGLE_MAPS_ENDPOINT}?${params}`;

  const init = {
    method: 'GET'
  };

  fetch(url, init).then(
    (res) => {
      if (res.ok) {
        return res.json();
      } else {
        throw new Error('Response was NOT ok.');
      }
    }).then((resJson) => {
      handleGoogleMapsDirectionsData(resJson);
      storage.persist();  // persist storage on success
    }).catch((reason) => {
      console.log('Error in fetching google maps directions data: ' + reason);
    });
}

/**
 * We listen for the following messages:
 *
 * { request: RequestMessage.STATUS }
 *  => { error: ['messages', ...] | null, data: { running: <boolean>, lastTrafficDurationResult: <Number>, lastChecked: <Date> } | null }
 *
 * { request: RequestMessage.START, data: { route: { origin:"", destination:"" }, apiKey:"", passphrase:"" } }
 *  => { error: ['messages', ...] | null }
 *
 * { request: RequestMessage.STOP }
 *  => { error: ['messages', ...] | null }
 *
 * { request: RequestMessage.RESUME, data: { passphrase:"" } }
 *  => { error: ['messages', ...] | null }
 *
 * { request: RequestMessage.CLEAR }
 *  => { error: ['messages', ...] | null }
 */

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id != chrome.runtime.id) {
    console.log('Received message from outside extension');
    return;
  }

  switch(message.request) {
    case RequestMessage.STATUS:
      console.log('status request')
      sendResponse({
        error: null,
        data: {
          running: state.running,
          lastTrafficDurationResult: state.lastTrafficDurationResult,
          lastChecked: state.lastChecked
        }
      });
      break;
    case RequestMessage.START:
      console.log('start request')

      const data = message.data;
      storage.setStorage(data);

      makeRouteRequest();
      clearAlarm();
      setAlarm(ALARM_INTERVAL_MINUTES);
      state.running = true;

      sendResponse({ error: null });
      break;
    case RequestMessage.STOP:
      console.log('stop request')

      clearAlarm();
      state.running = false;

      sendResponse({ error: null });
      break;
    case RequestMessage.RESUME:
      console.log('resume request');

      state.running = true;
      storage.retrievePersistedStorage(message.data.passphrase).then((decrypted) => {
        storage.setStorage(decrypted);

        makeRouteRequest();
        clearAlarm();
        setAlarm(ALARM_INTERVAL_MINUTES);

        sendResponse({ error: null });
      }).catch((reason) => {
        sendResponse({ error: [reason.toString()] });
      });
      break;
    case RequestMessage.CLEAR:
      console.log('clear request');

      storage.clear().then(() => {
        console.log('Persistent storage cleared.');
        sendResponse({ error: null });
      }).catch((reason) => {
        console.log('Unable to clear persistent storage due to: ' + reason);
        sendResponse({ error: [reason.toString()] });
      });
      break;
    default:
      console.log('Unknown request received: ' + JSON.stringify(message) + ',' + JSON.stringify(sender));
      return; // return from function - DO NOT RESPOND TO THIS REQUEST
  }

  return true;        // returning true here tells chrome we want to asynchronously resolve sendResponse
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name == ALARM_KEY) {
    makeRouteRequest();
  }
});

