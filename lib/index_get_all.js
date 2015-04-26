'use strict';
module.exports = function indexGetAll(index, options) {
  var result = [];
  var request = index.openCursor(options.range);

  return new Promise((resolve, reject) => {
    request.onerror = reject;
    request.onsuccess = event => {
      var cursor = event.target.result;
      if (!cursor) {
        return resolve(result);
      }

      result.push(cursor.value);
      cursor.continue();
    };
  });
}
