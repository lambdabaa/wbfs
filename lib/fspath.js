'use strict';
exports.getDirectory = function(path) {
  if (typeof path !== 'string' || path.indexOf('/') !== 0) {
    throw new Error(`${path} is not an absolute path`);
  }

  if (path === '/') {
    throw new Error('/ is the top-level directory');
  }

  return path.substring(0, path.lastIndexOf('/'));
};

exports.getFilename = function(filepath) {
  return filepath.substring(filepath.lastIndexOf('/') + 1, filepath.length);
};

exports.newChildPath = function(oldChildPath, oldParentPath, newParentPath) {
  return oldChildPath.replace(oldParentPath, newParentPath);
};
