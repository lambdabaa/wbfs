var expect = chai.expect;

suite('wbfs', function() {
  setup(function(done) {
    var deleteDatabase = indexedDB.deleteDatabase('fs');
    deleteDatabase.onerror = () => done(new Error('Error deleting database'));
    deleteDatabase.onsuccess = () => done();
  });

  teardown(function() {
    return wbfs.shutdown();
  });

  suite('#rename', function() {
    test('file does not exist', function() {
      var request = wbfs.rename('/foo.txt', '/bar.txt');
      return expect(request).to.eventually.be.rejectedWith(
        Error,
        '/foo.txt: No such file or directory'
      );
    });

    test('simple file', function() {
      return wbfs.writeFile('/file.txt', 'yo')
      .then(() => wbfs.rename('/file.txt', '/yo.txt'))
      .then(() => expect(wbfs.readFile('/yo.txt')).to.eventually.equal('yo'))
      .then(() => {
        var request = wbfs.readFile('/file.txt');
        return expect(request).to.eventually.be.rejectedWith(
          Error,
          '/file.txt: No such file or directory'
        );
      });
    });

    test('directory without children', function() {
      return wbfs.mkdir('/foo')
      .then(() => wbfs.rename('/foo', '/bar'))
      .then(() => expect(wbfs.readdir('/bar')).to.eventually.deep.equal([]))
      .then(() => {
        return expect(wbfs.readdir('/foo')).to.eventually.be.rejectedWith(
          Error,
          '/foo: No such file or directory'
        );
      });
    });

    test('directory with children', function() {
      return wbfs.mkdir('/foo')
      .then(() => wbfs.writeFile('/foo/bar.txt', 'bar'))
      .then(() => wbfs.writeFile('/foo/baz.txt', 'baz'))
      .then(() => wbfs.rename('/foo', '/foo2'))
      .then(() => {
        return expect(wbfs.readdir('/foo2')).to.eventually.deep.equal([
          'bar.txt',
          'baz.txt'
        ]);
      })
      .then(() => {
        return expect(wbfs.readdir('/foo')).to.be.rejectedWith(
          Error,
          '/foo: No such file or directory'
        );
      });
    });
  });

  suite('#unlink', function() {
    test('file', function() {
      return wbfs.writeFile('/foo.txt', 'bar')
      .then(() => wbfs.unlink('/foo.txt'))
      .then(() => {
        return expect(wbfs.readFile('/foo.txt')).to.eventually.be.rejectedWith(
          Error,
          '/foo.txt: No such file or directory'
        );
      });
    });

    test('dir', function() {
      return wbfs.mkdir('/foo').then(() => {
        return expect(wbfs.unlink('/foo')).to.be.rejectedWith(
          Error,
          'Cannot remove /foo: Is a directory'
        );
      });
    });
  });

  suite('#rmdir', function() {
    test('file', function() {
      return wbfs.writeFile('/foo', 'bar').then(() => {
        return expect(wbfs.rmdir('/foo')).to.be.rejectedWith(
          Error,
          'Cannot remove /foo: Not a directory'
        );
      });
    });

    test('dir', function() {
      return wbfs.mkdir('/foo')
      .then(() => wbfs.rmdir('/foo'))
      .then(() => {
        return expect(wbfs.readdir('/foo')).to.be.rejectedWith(
          Error,
          '/foo: No such file or directory'
        );
      });
    });

    test('nonempty dir', function() {
      return wbfs.mkdir('/foo')
      .then(() => wbfs.writeFile('/foo/bar.txt', 'baz'))
      .then(() => {
        return expect(wbfs.rmdir('/foo')).to.be.rejectedWith(
          Error,
          'Cannot remove /foo: Directory not empty'
        );
      });
    });
  });

  suite('#mkdir', function() {
    test('file already exists', function() {
      return wbfs.writeFile('/foo', 'bar').then(() => {
        return expect(wbfs.mkdir('/foo')).to.be.rejectedWith(
          Error,
          'Cannot create directory /foo: File exists'
        );
      });
    });

    test('should not allow making dir if parent does not exist', function() {
      var request = wbfs.mkdir('/foo/bar.txt', 'baz');
      return expect(request).to.eventually.be.rejectedWith(
        Error,
        '/foo: No such file or directory'
      );
    });

    test('should not allow making dir beneath file', function() {
      return wbfs.writeFile('/foo', '0').then(() => {
        var request = wbfs.mkdir('/foo/bar');
        return expect(request).to.eventually.be.rejectedWith(
          Error,
          '/foo: Not a directory'
        );
      });
    });
  });

  suite('#readdir', function() {
    test('directory does not exist', function() {
      return expect(wbfs.readdir('/random')).to.eventually.be.rejectedWith(
        Error,
        '/random: No such file or directory'
      );
    });

    test('on file', function() {
      return wbfs.writeFile('/file.txt', 'yo')
      .then(() => {
        return expect(wbfs.readdir('/file.txt')).to.eventually.be.rejectedWith(
          Error,
          '/file.txt: Not a directory'
        );
      });
    });

    test('empty directory', function() {
      return expect(wbfs.readdir('/')).to.eventually.deep.equal([]);
    });

    test('multiple files', function() {
      // TODO(gareth): Concurrent writing does not seem to work here.
      return wbfs.writeFile('/file1.txt', 'foo')
      .then(() => wbfs.writeFile('/file2.txt', 'bar'))
      .then(() => {
        return expect(wbfs.readdir('/')).to.eventually.deep.equal([
          'file1.txt',
          'file2.txt'
        ]);
      });
    });
  });

  suite('#readFile', function() {
    test('file does not exist', function() {
      return expect(wbfs.readFile('/foo.txt')).to.eventually.be.rejectedWith(
        Error,
        '/foo.txt: No such file or directory'
      );
    });

    test('on directory', function() {
      return expect(wbfs.readFile('/')).to.eventually.be.rejectedWith(
        Error,
        '/: Is a directory'
      );
    });
  });

  suite('#writeFile', function() {
    test('should not allow overwriting a directory', function() {
      return wbfs.mkdir('/foo').then(() => {
        var request = wbfs.writeFile('/foo', 'foobar');
        return expect(request).to.eventually.be.rejectedWith(
          Error,
          '/foo: Is a directory'
        );
      });
    });

    test('should not allow writing file to non-existing dir', function() {
      var request = wbfs.writeFile('/foo/bar.txt', 'baz');
      return expect(request).to.eventually.be.rejectedWith(
        Error,
        '/foo: No such file or directory'
      );
    });

    test('should not allow writing file beneath file', function() {
      return wbfs.writeFile('/foo', '0').then(() => {
        var request = wbfs.writeFile('/foo/bar', '1');
        return expect(request).to.eventually.be.rejectedWith(
          Error,
          '/foo: Not a directory'
        );
      });
    });

    test('should add the appropriate node to indexeddb', function() {
      var filename = '/file.txt';
      return wbfs.writeFile(filename, 'foo')
      .then(() => expect(wbfs.readFile(filename)).to.eventually.equal('foo'));
    });

    test('should overwrite existing data', function() {
      var filename = '/file.txt';
      return wbfs.writeFile(filename, 'foo')
      .then(() => wbfs.writeFile(filename, 'bar'))
      .then(() => expect(wbfs.readFile(filename)).to.eventually.equal('bar'));
    });
  });

  suite('#appendFile', function() {
    test('should create file if does not exist', function() {
      return wbfs.appendFile('/file.txt', 'foo').then(() => {
        return expect(wbfs.readFile('/file.txt')).to.eventually.equal('foo');
      });
    });

    test('should append to file if already exists', function() {
      return wbfs.writeFile('/file.txt', 'foo')
      .then(() => wbfs.appendFile('/file.txt', 'bar'))
      .then(() => expect(wbfs.readFile('/file.txt')).to.eventually.equal('foobar'));
    });
  });

  suite('#watch', function() {
    var fooWatcher, barWatcher, bazWatcher;

    setup(function() {
      return wbfs.mkdir('/foo')
      .then(() => wbfs.writeFile('/foo/bar', 'bar'))
      .then(() => wbfs.mkdir('/baz'))
      .then(() => {
        fooWatcher = wbfs.watch('/foo', { recursive: true });
        barWatcher = wbfs.watch('/foo/bar');
        bazWatcher = wbfs.watch('/baz');
      });
    });

    teardown(function() {
      fooWatcher.close();
      barWatcher.close();
      bazWatcher.close();
    });

    test('should return a wbfs.FSWatcher', function() {
      expect(fooWatcher).to.be.instanceOf(wbfs.FSWatcher);
    });

    test('rmdir should notify dir watcher', function() {
      var checkEvent = waitForEvent(bazWatcher, 'change').then(details => {
        expect(details).to.deep.equal({ filename: '/baz' });
      });

      return wbfs.rmdir('/baz').then(checkEvent);
    });

    test('rename should notify dir watchers', function() {
      var checkEvent = waitForEvent(bazWatcher, 'rename').then(details => {
        expect(details).to.deep.equal({ oldName: '/baz', newName: '/qux' });
      });

      return wbfs.rename('/baz', '/qux').then(checkEvent);
    });

    test('rename should notify file and recursive dir watchers', function() {
      var checkEvent = Promise.all([
        waitForEvent(fooWatcher, 'rename'),
        waitForEvent(barWatcher, 'rename')
      ])
      .then(results => {
        expect(results[0]).to.deep.equal(results[1]);
        expect(results[0]).to.deep.equal({
          oldName: '/foo/bar',
          newName: '/foo/qux'
        });
      });

      return wbfs.rename('/foo/bar', '/foo/qux').then(checkEvent);
    });

    test('mkdir should notify recursive dir watcher', function() {
      var checkEvent = waitForEvent(fooWatcher, 'change').then(details => {
        expect(details).to.deep.equal({ filename: '/foo/qux' });
      });

      return wbfs.mkdir('/foo/qux').then(checkEvent);
    });

    test('rename dir should notify recursive dir watcher', function() {
      var checkEvent = waitForEvent(fooWatcher, 'change').then(details => {
        expect(details).to.deep.equal({ filename: '/foo/qux' });
      });

      return wbfs.rename('/baz', '/foo/qux').then(checkEvent);
    });

    test('writeFile should notify recursive dir watcher', function() {
      var checkEvent = waitForEvent(fooWatcher, 'change').then(details => {
        expect(details).to.deep.equal({ filename: '/foo/qux' });
      });

      return wbfs.writeFile('/foo/qux', 'qux').then(checkEvent);
    });

    test('rename file should notify recursive dir watcher', function() {
      var checkEvent = waitForEvent(fooWatcher, 'change').then(details => {
        expect(details).to.deep.equal({ filename: '/foo/qux' });
      });

      return wbfs.writeFile('/baz/qux', 'qux')
      .then(() => wbfs.rename('/baz/qux', '/foo/qux'))
      .then(checkEvent);
    });

    test('append should notify file and recursive dir watchers', function() {
      var checkEvent = Promise.all([
        waitForEvent(fooWatcher, 'change'),
        waitForEvent(barWatcher, 'change')
      ])
      .then(results => {
        expect(results[0]).to.deep.equal(results[1]);
        expect(results[0]).to.deep.equal({ filename: '/foo/bar' });
      });

      return wbfs.appendFile('/foo/bar', 'qux').then(checkEvent);
    });

    test('unlink should notify file and recursive dir watchers', function() {
      var checkEvent = Promise.all([
        waitForEvent(fooWatcher, 'change'),
        waitForEvent(barWatcher, 'change')
      ])
      .then(results => {
        expect(results[0]).to.deep.equal(results[1]);
        expect(results[0]).to.deep.equal({ filename: '/foo/bar' });
      });

      return wbfs.unlink('/foo/bar').then(checkEvent);
    });

    test('#close should stop watcher from firing', function() {
      var check = Promise.race([
        waitForEvent(barWatcher, 'change'),
        new Promise(accept => setTimeout(accept, 1000, 'timeout'))
      ])
      .then(result => expect(result).to.equal('timeout'));

      // the change event shouldn't be fired after closing
      barWatcher.close();
      wbfs.unlink('/foo/bar').then(check);
    });
  });
});

function waitForEvent(emitter, eventType) {
  return new Promise(accept => emitter.on(eventType, accept));
}
