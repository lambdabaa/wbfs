module.exports = function indexGetAll(index, options) {
  let result = [];
  let request = index.openCursor(options.range);

  return new Promise((resolve, reject) => {
    request.onerror = reject;
    request.onsuccess = event => {
      let cursor = event.target.result;
      if (!cursor) {
        return accept(result);
      }

      result.push(cursor.value);
      cursor.continue();
    };
  });
}
