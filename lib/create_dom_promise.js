module.exports = function createDOMPromise(request) {
  return new Promise((resolve, reject) => {
    request.onerror = () => reject(request.errorCode);
    request.onsuccess = () => resolve(request.result);
  });
};
