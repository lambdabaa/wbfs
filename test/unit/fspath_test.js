var expect = require('chai').expect;
var fspath = require('../../lib/fspath');

suite('fspath', function() {
  test('#contains', function() {
    expect(fspath.contains('/path', '/path/to/exile')).to.equal(true);
    expect(fspath.contains('/path', '/math/to/exile')).to.equal(false);
  });

  test('#getDirectory', function() {
    expect(fspath.getDirectory('/path/to/exile')).to.equal('/path/to');
  });

  test('#getDirectory root', function() {
    expect(fspath.getDirectory('/path.md')).to.equal('/');
  });

  test('#getFilename', function() {
    expect(fspath.getFilename('/path/to/exile.md')).to.equal('exile.md');
  });

  test('#newChildPath', function() {
    expect(
      fspath.newChildPath(
        '/path/to/exile',
        '/path/to',
        '/new/path/to'
      )
    ).to.equal('/new/path/to/exile');
  });
});
