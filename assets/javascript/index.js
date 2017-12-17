import { gatherFormData } from './lib/form-reader';
import RequestMessage from './lib/request-message';
import Storage from './lib/storage';

/**
 * Front end logic for canigo, handling form input, etc.
 */
document.addEventListener('DOMContentLoaded', () => {
  const STORAGE_KEY = 'canigoKey';   // key to retrieve storage
  const storage = new Storage(STORAGE_KEY);

  // DOM related constants
  const passphraseFormSelector = '#pw-form';
  const routeFormSelector = '#route-form';
  const pauseButtonSelector = '#pause-btn';
  const clearDataSelector = '#clear-all-data';
  const runningMessageSelector = '#running-message';
  const timeInTrafficMessageSelector = '#time-in-traffic-message';
  const lastCheckedMessageSelector = '#last-checked-message';

  let hasExistingPassphrase;

  // naive validation on the presence of required items
  // to track a route
  function validate(data) {
    return data.route.origin.length && data.route.destination.length && data.apiKey.length && data.passphrase.length;
  }

  function handlePassphraseSubmission(passphrase) {
    if (passphrase && passphrase.length > 0) {
      // let event page know so that it can attempt to resume last route
      chrome.runtime.sendMessage(
        chrome.runtime.id,
        {
          request: RequestMessage.RESUME,
          data: {
            passphrase: passphrase
          }
        },
        (response) => {
          if (response.error) {
            console.log('Unable to resume route: ');
            console.log(response.error);
          } else {
            console.log('Resumed route!');
          }
        }
      );
    }
  }

  // retrieve last status from event page
  function getStatus(cb) {
    chrome.runtime.sendMessage(
      chrome.runtime.id,
      {
        request: RequestMessage.STATUS
      },
      (response) => {
        cb(response);
      }
    );
  }

  function renderMessages(messages) {
    document.querySelector(runningMessageSelector).innerText = messages.running;
    document.querySelector(timeInTrafficMessageSelector).innerText = messages.timeInTraffic;
    document.querySelector(lastCheckedMessageSelector).innerText = messages.lastChecked;
  }

  function renderMessagesBasedOnStatus(result) {
    const messages = {};
    if (result.error > 0) {
      console.log('Status check failed: ');
      console.log(result);
    } else if (result.data.lastTrafficDurationResult && result.data.lastChecked) {
      messages.running = result.data.running ? 'Running' : 'Idle';
      messages.timeInTraffic = `${Math.round(result.data.lastTrafficDurationResult)} minutes`;
      messages.lastChecked = new Date(result.data.lastChecked).toTimeString();
    }

    renderMessages(messages);
  }

  document.querySelector(clearDataSelector).addEventListener('click', (e) => {
    e.preventDefault();

    chrome.runtime.sendMessage(
      chrome.runtime.id,
      {
        request: RequestMessage.CLEAR
      },
      (response) => {
        console.log(response);

        setTimeout(() => {
          getStatus(renderMessagesBasedOnStatus);
        }, 2000);
      }
    );
  });

  document.querySelector(passphraseFormSelector).addEventListener('submit', (e) => {
    e.preventDefault();

    const pw = gatherFormData(passphraseFormSelector).pw;
    handlePassphraseSubmission(pw);

    setTimeout(() => {
      getStatus(renderMessagesBasedOnStatus);
    }, 2000);
  });

  document.querySelector(routeFormSelector).addEventListener('submit', (e) => {
    e.preventDefault();

    const routeFormData = gatherFormData(routeFormSelector);
    const routeData = {
      apiKey: routeFormData['api-key'],
      passphrase: routeFormData['new-passphrase'],
      route: {
        origin: routeFormData['origin'],
        destination: routeFormData['destination']
      }
    }

    if (validate(routeData)) {
      chrome.runtime.sendMessage(
        chrome.runtime.id,
        {
          request: RequestMessage.START,
          data: routeData
        },
        function(response) {
          console.log(response);

          setTimeout(() => {
            getStatus(renderMessagesBasedOnStatus);
          }, 2000);
        }
      );
    } else {
      alert('One or more fields are missing!');
    }
  });

  document.querySelector(pauseButtonSelector).addEventListener('click', (e) => {
    e.preventDefault();

    chrome.runtime.sendMessage(
      chrome.runtime.id,
      {
        request: RequestMessage.STOP
      },
      (response) => {
        console.log('pause: ');
        console.log(response);

        setTimeout(() => {
          getStatus(renderMessagesBasedOnStatus);
        }, 2000);
      }
    );
  });

  // on popup open, get status and render to UI
  getStatus(renderMessagesBasedOnStatus);
});