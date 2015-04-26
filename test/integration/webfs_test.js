var expect = chai.expect;

suite('webfs', function() {
  setup(function(done) {
    var deleteDatabase = indexedDB.deleteDatabase('fs');
    deleteDatabase.onerror = () => done(new Error('Error deleting database'));
    deleteDatabase.onsuccess = () => done();
  });

  teardown(function() {
    return webfs.shutdown();
  });

  suite('#rename', function() {
    test('file does not exist', function() {
      var request = webfs.rename('/foo.txt', '/bar.txt');
      return expect(request).to.eventually.be.rejectedWith(
        Error,
        '/foo.txt: No such file or directory'
      );
    });

    test('simple file', function() {
      return webfs.writeFile('/file.txt', 'yo')
      .then(() => webfs.rename('/file.txt', '/yo.txt'))
      .then(() => expect(webfs.readFile('/yo.txt')).to.eventually.equal('yo'))
      .then(() => {
        var request = webfs.readFile('/file.txt');
        return expect(request).to.eventually.be.rejectedWith(
          Error,
          '/file.txt: No such file or directory'
        );
      });
    });

    test('directory without children', function() {
      return webfs.mkdir('/foo')
      .then(() => webfs.rename('/foo', '/bar'))
      .then(() => expect(webfs.readdir('/bar')).to.eventually.deep.equal([]))
      .then(() => {
        return expect(webfs.readdir('/foo')).to.eventually.be.rejectedWith(
          Error,
          '/foo: No such file or directory'
        );
      });
    });

    test('directory with children', function() {
      return webfs.mkdir('/foo')
      .then(() => webfs.writeFile('/foo/bar.txt', 'bar'))
      .then(() => webfs.writeFile('/foo/baz.txt', 'baz'))
      .then(() => webfs.rename('/foo', '/foo2'))
      .then(() => {
        return expect(webfs.readdir('/foo2')).to.eventually.deep.equal([
          'bar.txt',
          'baz.txt'
        ]);
      })
      .then(() => {
        return expect(webfs.readdir('/foo')).to.be.rejectedWith(
          Error,
          '/foo: No such file or directory'
        );
      });
    });
  });

  suite('#mkdir', function() {
    test('file already exists', function() {
      return webfs.writeFile('/foo', 'bar').then(() => {
        return expect(webfs.mkdir('/foo')).to.be.rejectedWith(
          Error,
          'Cannot create directory /foo: File exists'
        );
      });
    });
  });

  suite('#readdir', function() {
    test('directory does not exist', function() {
      return expect(webfs.readdir('/random')).to.eventually.be.rejectedWith(
        Error,
        '/random: No such file or directory'
      );
    });

    test('on file', function() {
      return webfs.writeFile('/file.txt', 'yo')
      .then(() => {
        return expect(webfs.readdir('/file.txt')).to.eventually.be.rejectedWith(
          Error,
          '/file.txt: Not a directory'
        );
      });
    });

    test('empty directory', function() {
      return expect(webfs.readdir('/')).to.eventually.deep.equal([]);
    });

    test('multiple files', function() {
      // TODO(gareth): Concurrent writing does not seem to work here.
      return webfs.writeFile('/file1.txt', 'foo')
      .then(() => webfs.writeFile('/file2.txt', 'bar'))
      .then(() => {
        return expect(webfs.readdir('/')).to.eventually.deep.equal([
          'file1.txt',
          'file2.txt'
        ]);
      });
    });
  });

  suite('#readFile', function() {
    test('file does not exist', function() {
      return expect(webfs.readFile('/foo.txt')).to.eventually.be.rejectedWith(
        Error,
        '/foo.txt: No such file or directory'
      );
    });

    test('on directory', function() {
      return expect(webfs.readFile('/')).to.eventually.be.rejectedWith(
        Error,
        '/: Is a directory'
      );
    });
  });

  suite('#writeFile', function() {
    test('should not allow overwriting a directory', function() {
      var request = webfs.writeFile('/', 'foobar');
      return expect(request).to.eventually.be.rejectedWith(
        Error,
        '/: Is a directory'
      );
    });

    test('should add the appropriate node to indexeddb', function() {
      var filename = '/file.txt';
      return webfs.writeFile(filename, 'foo')
      .then(() => expect(webfs.readFile(filename)).to.eventually.equal('foo'));
    });

    test('should overwrite existing data', function() {
      var filename = '/file.txt';
      return webfs.writeFile(filename, 'foo')
      .then(() => webfs.writeFile(filename, 'bar'))
      .then(() => expect(webfs.readFile(filename)).to.eventually.equal('bar'));
    });
  });
});
