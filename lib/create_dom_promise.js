'use strict';
module.exports = function createDOMPromise(request) {
  return new Promise((resolve, reject) => {
    request.onerror = () => reject(request.error || request.errorCode);
    if (request instanceof IDBTransaction) {
      request.oncomplete = resolve;
    } else {
      request.onsuccess = () => resolve(request.result);
    }
  });
};
