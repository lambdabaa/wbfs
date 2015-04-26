webfs
=====

Implementation of a basic subset of node's fs v0.12 api for the web.

[![Build Status](https://travis-ci.org/gaye/webfs.png?branch=master)](https://travis-ci.org/gaye/webfs)

### Caveats

This is only known to work in Firefox currently since support for es6
features such as promises, generators, arrow functions, and template
strings is assumed.

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

#### FSWatcher

+ `watch()` and `FSWatcher` are not implemented.
