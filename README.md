webfs
=====

Implementation of a basic subset of node's fs v0.12 api for the web with
some [caveats](#caveats).

[![Build Status](https://travis-ci.org/gaye/webfs.png?branch=master)](https://travis-ci.org/gaye/webfs)

Run the integration tests [in your browser](https://gaye.github.io/webfs/test/integration/).

### Usage

```js
var co = require('co');
var fs = require('webfs');

co(function*() {
  yield fs.mkdir('/poems');

  var haiku = `An old silent pond...
               A frog jumps into the pond,
               Splash! Silence again.`

  // Write the haiku to a file.
  yield fs.writeFile('/poems/basho_matsuo.txt', haiku);

  // Oops! The author forgot to sign it.
  yield fs.appendFile('/poems/basho_matsuo.txt', ' -Basho');

  // Rename the poem file.
  yield fs.rename('/poems/basho_matsuo.txt', '/poems/frog_haiku.txt');

  // Spring cleaning! Rename the poems directory to 'haikus'.
  yield fs.rename('/poems', '/haikus');

  // Read the contents of the haikus directory.
  var list = yield fs.readdir('/haikus');
  console.log(list);  // ['frog_haiku.txt']

  // Read the frog poem file.
  var data = yield fs.readFile('/haikus/frog_haiku.txt');
  console.log(data);  // ${haiku} -Basho

  // Delete the frog poem.
  yield fs.unlink('/haikus/frog_haiku.txt');
  list = yield fs.readdir('/haikus');
  console.log(list);  // []

  // Delete the haikus directory.
  yield fs.rmdir('/haikus');
  try {
    yield fs.readdir('/haikus');
  } catch (error) {
    console.log(error.message);  // /haikus: No such file or directory
  }

  var watcher = fs.watch('/poems', { recursive: true });

  watcher.on('change', details => {
    console.log(details);  // { filename: '/poems/pi.txt' }
  });

  watcher.on('rename', details => {
    console.log(details);  // { oldName: '/poems/pi.txt', newName: /poems/irrational.txt' }
  });

  yield fs.writeFile('/poems/pi.txt', '3.1415');
  yield fs.rename('/poems/pi.txt', '/poems/irrational.txt');

  watcher.close();
});

// Or without co + generators...

fs.mkdir('poems')
.then(() => {
  // Write the haiku to a file.
  return fs.writeFile('/poems/basho_matsuo.txt', haiku);
})
.then(() => {
  // Oops! The author forgot to sign it.
  return fs.appendFile('/poems/basho_matsuo.txt', ' -Basho');
})
.then(() => {
  // Rename the poem file.
  return fs.rename('/poems/basho_matsuo.txt', '/poems/frog_haiku.txt');
})
.then(() => {
  // Spring cleaning! Rename the poems directory to 'haikus'.
  return fs.rename('/poems', '/haikus');
})
.then(() => {
  // Read the frog poem file.
  return fs.readdir('/haikus');
})
.then(list => {
  console.log(list);  // ['frog_haiku.txt']

  // Delete the frog poem.
  return fs.unlink('/haikus/frog_haiku.txt');
})
.then(() => {
  return fs.readdir('/haikus');
})
.then(list => {
  console.log(list);  // []

  // Delete the haikus directory.
  returrn fs.rmdir('/haikus');
})
.then(() => {
  fs.readdir('/haikus').catch(error => {
    console.log(error.message);  // /haikus: No such file or directory
  });
});
```

### Caveats

This is only known to work in Firefox currently since support for
indexedDB as well as es6 features such as promises, generators, proxies,
arrow functions, destructuring, and template strings is assumed.

#### Invocation style

+ No synchronous methods are implemented.
+ Asynchronous methods use promises instead of callbacks.

#### File permissions

+ Neither file permissions nor the methods that let you interact with
  them such as `chown()`, `chmod()`, and `access()` are implemented.
+ Methods that take an optional `mode` argument in the nodejs api do not
  honor the `mode` (since there are no file permissions).

#### Buffers and streams

+ There are no buffers. The `write()`, `readFile()`, `writeFile()`, and
  `appendFile()` methods all coerce values to strings.
+ `createReadStream()`, `ReadStream`, `createWriteStream()`, and
  `WriteStream` are not implemented.

#### fs.exists()

+ `exists()` is not implemented since it is slated for deprecation in
  the nodejs api as of v0.12.
