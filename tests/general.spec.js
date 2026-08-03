/**
 * Shared test specs for node and browser targets...
 * 
 * Each target will handle its own setup:
 * - loading mocha/chai/sinon
 * - define useRealCrypto/useStubbedCrypto functions
 * - loading test subjects
 * - defining testNum var
 * 
 * Each target should have its own npm run scripts:
 * - prepare-test-$target
 * - test-$target
 */

describe(`${testNum} - General tests`, function () {

  describe(`${testNum}A - Edge cases`, function () {

    beforeEach(function () {
      useRealCrypto();
    });

    it('serializing a non-function', async function () {
      try { await serialize({}) } catch(err) {
        assert.include(`${err}`, 'Invalid argument type, must be a function');
        return;
      }
      assert.fail('should have failed given a non-function');
    });

    it('function with overridden toString', async function () {
      const subject = new Function();
      subject.toString = () => 'something that does not match a valid function';
      try { await serialize(subject) } catch(err) {
        assert.include(`${err}`, 'Unsupported function format');
        return;
      }
      assert.fail('should have failed given an unexpected function string');
    });

    it('error hashing serialized function', async function () {
      const stub = useStubbedCrypto();
      stub.throws(Error('no crypto for you'));
      try {
        await serialize(new Function(), { hash: true });
      } catch(err) {
        assert.include(`${err}`, 'Failure hashing serialized function');
        assert.equal(err.constructor.name, 'SerializeError');

        assert.include(`${err.cause}`, 'Failed to generate hash digest');
        assert.equal(err.cause.constructor.name, 'CryptoError');

        assert.include(`${err.cause.cause}`, 'no crypto for you');
        assert.equal(err.cause.cause.constructor.name, 'Error');

        return;
      }
      assert.fail('should have failed generating hash');
    });

    it('error checksumming deserialized function', async function () {
      const input = await serialize(new Function(), { hash: true });
      const stub = useStubbedCrypto();
      stub.throws(Error('you again?'));
      try {
        await deserialize(input, { hash: true });
      } catch(err) {
        assert.include(`${err}`, 'Failure generating checksum');
        assert.equal(err.constructor.name, 'DeserializeError');

        assert.include(`${err.cause}`, 'Failed to generate hash digest');
        assert.equal(err.cause.constructor.name, 'CryptoError');

        assert.include(`${err.cause.cause}`, 'you again?');
        assert.equal(err.cause.cause.constructor.name, 'Error');
        
        return;
      }
      assert.fail('should have failed generating checksum');
    });

    it('error checksumming without a hash', async function () {
      const input = await serialize(new Function());
      try {
        await deserialize(input, { hash: true });
      } catch(err) {
        assert.include(`${err}`, 'Deserialized function missing hash');
        return;
      }
      assert.fail('should have failed generating checksum');
    });

  });

  describe(`${testNum}B - Named function declaration`, function () {

    function namedDeclaredInclude (a,b) {
      return a.toLowerCase().startsWith(b.toLowerCase());
    }
    let serialized, deserialized;

    it('serializes', async function () {
      serialized = await serialize(namedDeclaredInclude, { hash: true });
      assert.deepEqual(
        serialized,
        {
          params: ['a','b'],
          body: 'return a.toLowerCase().startsWith(b.toLowerCase());',
          type: 'Function',
          hash: '775236d134b4bc44ef79f6a4bec5e0938506172793ef7131b8f4dd8b6de0f915',
        }
      );
    });

    it('deserializes', async function () {
      deserialized = await deserialize(serialized);
      assert.equal(
        deserialized.toString(),
        `function anonymous(a,b
) {
return a.toLowerCase().startsWith(b.toLowerCase());
}`
      );
    });

    it('invokes', async function () {
      assert.isFalse(deserialized('AardVark', 'vark'));
      assert.isTrue(deserialized('aardvark', 'aard'));
    });

    it('checksum works', async function () {
      await deserialize(serialized, { hash: true });
      serialized.params.push('c');
      try {
        await deserialize(serialized, { hash: true });
      } catch(err) {
        assert.include(`${err}`, 'Checksum failed');
        return;
      }
      assert.fail('should have failed checksum');
    });

  });

  describe(`${testNum}C - Assigned function declaration`, function () {

    const assignedDeclaredInclude = function (c,d) {
      return c.toLowerCase().startsWith(d.toLowerCase());
    }
    let serialized, deserialized;

    it('serializes', async function () {
      serialized = await serialize(assignedDeclaredInclude, { hash: true });
      assert.deepEqual(
        serialized,
        {
          params: ['c','d'],
          body: 'return c.toLowerCase().startsWith(d.toLowerCase());',
          type: 'Function',
          hash: 'd5404c003cdcd61ec0071c42a9ffee0d79d512f71fb240f4269e7b5d00bedac3',
        }
      );
    });

    it('deserializes', async function () {
      deserialized = await deserialize(serialized);
      assert.equal(
        deserialized.toString(),
        `function anonymous(c,d
) {
return c.toLowerCase().startsWith(d.toLowerCase());
}`
      );
    });

    it('invokes', async function () {
      assert.isFalse(deserialized('AardVark', 'vark'));
      assert.isTrue(deserialized('aardvark', 'aard'));
    });

    it('checksum works', async function () {
      await deserialize(serialized, { hash: true });
      serialized.params.push('c');
      try {
        await deserialize(serialized, { hash: true });
      } catch(err) {
        assert.include(`${err}`, 'Checksum failed');
        return;
      }
      assert.fail('should have failed checksum');
    });

  });

  describe(`${testNum}D - Named async function declaration`, function () {

    async function namedAsyncSleep (ms) {
      return await new Promise(
        resolve => {
          const cb = () => resolve(3.14);
          setTimeout(cb, ms)
        }
      );
    }
    let serialized, deserialized;

    it('serializes', async function () {
      serialized = await serialize(namedAsyncSleep, { hash: true });
      assert.deepEqual(
        serialized,
        {
          params: ['ms'],
          body: `return await new Promise(
resolve => {
const cb = () => resolve(3.14);
setTimeout(cb, ms)
}
);`,
          type: 'AsyncFunction',
          hash: 'b33fa155faf7f4411f01746f2c0327cf9c932e76944f2e81a4a61cf08deaf0d1',
        }
      );
    });

    it('deserializes', async function () {
      deserialized = await deserialize(serialized);
      assert.equal(
        deserialized.toString(),
        `async function anonymous(ms
) {
return await new Promise(
resolve => {
const cb = () => resolve(3.14);
setTimeout(cb, ms)
}
);
}`
      );
    });

    it('invokes', async function () {
      assert.equal(
        await deserialized(0),
        3.14
      );
    });

    it('checksum works', async function () {
      await deserialize(serialized, { hash: true });
      serialized.params.push('c');
      try {
        await deserialize(serialized, { hash: true });
      } catch(err) {
        assert.include(`${err}`, 'Checksum failed');
        return;
      }
      assert.fail('should have failed checksum');
    });

  });

  describe(`${testNum}E - Assigned async function declaration`, function () {

    const assignedAsyncSleep = async function (ms) {
      return await new Promise(
        resolve => {
          const cb = () => resolve(6.28);
          setTimeout(cb, ms)
        }
      );
    };
    let serialized, deserialized;

    it('serializes', async function () {
      serialized = await serialize(assignedAsyncSleep, { hash: true });
      assert.deepEqual(
        serialized,
        {
          params: ['ms'],
          body: `return await new Promise(
resolve => {
const cb = () => resolve(6.28);
setTimeout(cb, ms)
}
);`,
          type: 'AsyncFunction',
          hash: '295a6165ac46db59371bd6c18f96381f340de90dc64ff9fbd273bf7353a17d2e',
        }
      );
    });

    it('deserializes', async function () {
      deserialized = await deserialize(serialized);
      assert.equal(
        deserialized.toString(),
        `async function anonymous(ms
) {
return await new Promise(
resolve => {
const cb = () => resolve(6.28);
setTimeout(cb, ms)
}
);
}`
      );
    });

    it('invokes', async function () {
      assert.equal(
        await deserialized(0),
        6.28
      );
    });

    it('checksum works', async function () {
      await deserialize(serialized, { hash: true });
      serialized.params.push('c');
      try {
        await deserialize(serialized, { hash: true });
      } catch(err) {
        assert.include(`${err}`, 'Checksum failed');
        return;
      }
      assert.fail('should have failed checksum');
    });

  });

  describe(`${testNum}F - Arrow function declaration`, function () {

    const assignedArrowInclude = (c,d) => {
      return c.toLowerCase().startsWith(d.toLowerCase());
    }
    let serialized, deserialized;

    it('serializes', async function () {
      serialized = await serialize(assignedArrowInclude, { hash: true });
      assert.deepEqual(
        serialized,
        {
          params: ['c','d'],
          body: 'return c.toLowerCase().startsWith(d.toLowerCase());',
          type: 'ArrowFunction',
          hash: '1f6625686c9aabdfee53480b50e376317066aa6924d5501cc689914f8d6e92ac',
        }
      );
    });

    it('deserializes', async function () {
      deserialized = await deserialize(serialized);
      assert.equal(
        deserialized.toString(),
        `function anonymous(c,d
) {
return c.toLowerCase().startsWith(d.toLowerCase());
}`
      );
    });

    it('invokes', async function () {
      assert.isFalse(deserialized('AardVark', 'vark'));
      assert.isTrue(deserialized('aardvark', 'aard'));
    });

    it('checksum works', async function () {
      await deserialize(serialized, { hash: true });
      serialized.params.push('c');
      try {
        await deserialize(serialized, { hash: true });
      } catch(err) {
        assert.include(`${err}`, 'Checksum failed');
        return;
      }
      assert.fail('should have failed checksum');
    });

  });

  describe(`${testNum}G - Async arrow function declaration`, function () {

    const assignedArrowAsyncSleep = async (ms) => {
      return await new Promise(
        resolve => {
          const cb = () => resolve(9.42);
          setTimeout(cb, ms)
        }
      );
    };
    let serialized, deserialized;

    it('serializes', async function () {
      serialized = await serialize(assignedArrowAsyncSleep, { hash: true });
      assert.deepEqual(
        serialized,
        {
          params: ['ms'],
          body: `return await new Promise(
resolve => {
const cb = () => resolve(9.42);
setTimeout(cb, ms)
}
);`,
          type: 'AsyncArrowFunction',
          hash: 'c4d6870310bb7a7eb5651cb609fd499bc79577df35f95ffc290ccf484f20db30',
        }
      );
    });

    it('deserializes', async function () {
      deserialized = await deserialize(serialized);
      assert.equal(
        deserialized.toString(),
        `async function anonymous(ms
) {
return await new Promise(
resolve => {
const cb = () => resolve(9.42);
setTimeout(cb, ms)
}
);
}`
      );
    });

    it('invokes', async function () {
      assert.equal(
        await deserialized(0),
        9.42
      );
    });

    it('checksum works', async function () {
      await deserialize(serialized, { hash: true });
      serialized.params.push('c');
      try {
        await deserialize(serialized, { hash: true });
      } catch(err) {
        assert.include(`${err}`, 'Checksum failed');
        return;
      }
      assert.fail('should have failed checksum');
    });

  });

  describe(`${testNum}H - Arrow function with bare parameter`, function () {

    const noParenArrowTrim = w => {
      return w.trim();
    };
    let serialized, deserialized;

    it('serializes', async function () {
      serialized = await serialize(noParenArrowTrim, { hash: true });
      assert.deepEqual(
        serialized,
        {
          params: ['w'],
          body: 'return w.trim();',
          type: 'ArrowFunction',
          hash: '416b9d74ca308af16027bd74ffb1c5d617c98c9a2984e78ff26f12e50874b035',
        }
      );
    });

    it('deserializes', async function () {
      deserialized = await deserialize(serialized);
      assert.equal(
        deserialized.toString(),
        `function anonymous(w
) {
return w.trim();
}`
      );
    });

    it('invokes', async function () {
      assert.equal(deserialized(' aardvark '), 'aardvark');
      assert.equal(deserialized(`zebra
`), 'zebra');
    });

    it('checksum works', async function () {
      await deserialize(serialized, { hash: true });
      serialized.params.push('c');
      try {
        await deserialize(serialized, { hash: true });
      } catch(err) {
        assert.include(`${err}`, 'Checksum failed');
        return;
      }
      assert.fail('should have failed checksum');
    });

  });

  describe(`${testNum}I - Arrow function with bare expression body`, function () {

    const noBraceArrowTrim = (x) => x.trim();
    let serialized, deserialized;

    it('serializes', async function () {
      serialized = await serialize(noBraceArrowTrim, { hash: true });
      assert.deepEqual(
        serialized,
        {
          params: ['x'],
          body: 'return (x.trim());',
          type: 'ArrowFunction',
          hash: '8821066441f57edc542274a78c8de8286d0f16e6245887a95ecafcc94b124261',
        }
      );
    });

    it('deserializes', async function () {
      deserialized = await deserialize(serialized);
      assert.equal(
        deserialized.toString(),
        `function anonymous(x
) {
return (x.trim());
}`
      );
    });

    it('invokes', async function () {
      assert.equal(deserialized(' aardvark '), 'aardvark');
      assert.equal(deserialized(`zebra
`), 'zebra');
    });

    it('checksum works', async function () {
      await deserialize(serialized, { hash: true });
      serialized.params.push('c');
      try {
        await deserialize(serialized, { hash: true });
      } catch(err) {
        assert.include(`${err}`, 'Checksum failed');
        return;
      }
      assert.fail('should have failed checksum');
    });

  });

  describe(`${testNum}J - Arrow function with bare parameter and bare expression body`, function () {
    const noParenOrBraceArrowTrim = y => y.trim();
    let serialized, deserialized;

    it('serializes', async function () {
      serialized = await serialize(noParenOrBraceArrowTrim, { hash: true });
      assert.deepEqual(
        serialized,
        {
          params: ['y'],
          body: 'return (y.trim());',
          type: 'ArrowFunction',
          hash: '9e768208adebd98a60e50e277341634ee94cbdf16ed3c8cfb88ad6179f9e4378',
        }
      );
    });

    it('deserializes', async function () {
      deserialized = await deserialize(serialized);
      assert.equal(
        deserialized.toString(),
        `function anonymous(y
) {
return (y.trim());
}`
      );
    });

    it('invokes', async function () {
      assert.equal(deserialized(' aardvark '), 'aardvark');
      assert.equal(deserialized(`zebra
`), 'zebra');
    });

    it('checksum works', async function () {
      await deserialize(serialized, { hash: true });
      serialized.params.push('c');
      try {
        await deserialize(serialized, { hash: true });
      } catch(err) {
        assert.include(`${err}`, 'Checksum failed');
        return;
      }
      assert.fail('should have failed checksum');
    });

  });

  describe(`${testNum}K - Arrow function with bare parameter and parenthetical expression body`, function () {
    const parenExprBodyArrowWrap = z => ({z});
    let serialized, deserialized;

    it('serializes', async function () {
      serialized = await serialize(parenExprBodyArrowWrap, { hash: true });
      assert.deepEqual(
        serialized,
        {
          params: ['z'],
          body: 'return (({z}));',
          type: 'ArrowFunction',
          hash: 'a4b73af619885756d39e9e853753288a017d608b9e3822b1a856e9e53844987b',
        }
      );
    });

    it('deserializes', async function () {
      deserialized = await deserialize(serialized);
      assert.equal(
        deserialized.toString(),
        `function anonymous(z
) {
return (({z}));
}`
      );
    });

    it('invokes', async function () {
      assert.deepEqual(deserialized('aardvark'), { z: 'aardvark' });
      assert.deepEqual(deserialized(3.14), { z: 3.14 });
    });

    it('checksum works', async function () {
      await deserialize(serialized, { hash: true });
      serialized.params.push('c');
      try {
        await deserialize(serialized, { hash: true });
      } catch(err) {
        assert.include(`${err}`, 'Checksum failed');
        return;
      }
      assert.fail('should have failed checksum');
    });

  });

  describe(`${testNum}L - Generator function declaration`, function () {
    function* generatorIter(a,b) {
      yield a;
      yield b;
      yield 3.14;
    }
    let serialized, deserialized;

    it('serializes', async function () {
      serialized = await serialize(generatorIter, { hash: true });
      assert.deepEqual(
        serialized,
        {
          params: ['a','b'],
          body: `yield a;
yield b;
yield 3.14;`,
          type: 'Generator',
          hash: '05373efccc620595fd06b376b0af2f83f658db2b7b31f6082f02ebfb21254a81',
        }
      );
    });

    it('deserializes', async function () {
      deserialized = await deserialize(serialized);
      assert.equal(
        deserialized.toString(),
        `function* anonymous(a,b
) {
yield a;
yield b;
yield 3.14;
}`
      );
    });

    it('invokes', async function () {
      const iter = deserialized(1,2);
      assert.deepEqual(iter.next(), { value: 1, done: false });
      assert.deepEqual(iter.next(), { value: 2, done: false });
      assert.deepEqual(iter.next(), { value: 3.14, done: false });
      assert.deepEqual(iter.next(), { value: undefined, done: true });
    });

    it('checksum works', async function () {
      await deserialize(serialized, { hash: true });
      serialized.params.push('c');
      try {
        await deserialize(serialized, { hash: true });
      } catch(err) {
        assert.include(`${err}`, 'Checksum failed');
        return;
      }
      assert.fail('should have failed checksum');
    });
  });

  describe(`${testNum}M - Async generator function declaration`, function () {
    async function* asyncGeneratorIter(c,d) {
      yield Promise.resolve(c);
      yield await Promise.resolve(d);
      yield 6.28;
    }
    let serialized, deserialized;

    it('serializes', async function () {
      serialized = await serialize(asyncGeneratorIter, { hash: true });
      assert.deepEqual(
        serialized,
        {
          params: ['c','d'],
          body: `yield Promise.resolve(c);
yield await Promise.resolve(d);
yield 6.28;`,
          type: 'AsyncGenerator',
          hash: 'c69f756f61c37aa5376335c4064857fa4de045ef1e228d05b5689b62ace39a5e',
        }
      );
    });

    it('deserializes', async function () {
      deserialized = await deserialize(serialized);
      assert.equal(
        deserialized.toString(),
        `async function* anonymous(c,d
) {
yield Promise.resolve(c);
yield await Promise.resolve(d);
yield 6.28;
}`
      );
    });

    it('invokes', async function () {
      const iter = deserialized(3,4);
      assert.deepEqual(await iter.next(), { value: 3, done: false });
      assert.deepEqual(await iter.next(), { value: 4, done: false });
      assert.deepEqual(await iter.next(), { value: 6.28, done: false });
      assert.deepEqual(await iter.next(), { value: undefined, done: true });
    });

    it('checksum works', async function () {
      await deserialize(serialized, { hash: true });
      serialized.params.push('c');
      try {
        await deserialize(serialized, { hash: true });
      } catch(err) {
        assert.include(`${err}`, 'Checksum failed');
        return;
      }
      assert.fail('should have failed checksum');
    });

  });

  describe(`${testNum}N - Function with multiple lines of body and extraneous use of block comments`, function () {

    function blockCommentedInclude (a,b) {
      /**
       * first, converts argument `b` to all lower case
       */
      b = b.toLowerCase()
      /**
       * second, tests that argument `a` starts with
       * new value of `b`
       */
      const result = a.toLowerCase().startsWith(b)
      /**
       * finally, returns result of above test
       */
      return result
    }
    let serialized, deserialized;

    it('serializes with comments removed by default', async function () {
      serialized = await serialize(blockCommentedInclude, { hash: true });
      assert.deepEqual(
        serialized,
        {
          params: ['a','b'],
          body: `b = b.toLowerCase()
const result = a.toLowerCase().startsWith(b)
return result`,
          type: 'Function',
          hash: '753d60b82acae70722b0d95a0ac95cb5b80ce00c05cd4b569250cdd3a7376088',
        }
      );
    });

    it('serializes preserving comments on demand', async function () {
      serialized = await serialize(blockCommentedInclude, { hash: true, comments: true });
      assert.deepEqual(
        serialized,
        {
          params: ['a','b'],
          body: `/**
* first, converts argument \`b\` to all lower case
*/
b = b.toLowerCase()
/**
* second, tests that argument \`a\` starts with
* new value of \`b\`
*/
const result = a.toLowerCase().startsWith(b)
/**
* finally, returns result of above test
*/
return result`,
          type: 'Function',
          hash: 'f418d223914b35ebfc5c98e032d1e3d92331de7e51732312a98fb5992bae840d',
        }
      );
    });

    it('deserializes restoring comments', async function () {
      deserialized = await deserialize(serialized);
      assert.equal(
        deserialized.toString(),
        `function anonymous(a,b
) {
/**
* first, converts argument \`b\` to all lower case
*/
b = b.toLowerCase()
/**
* second, tests that argument \`a\` starts with
* new value of \`b\`
*/
const result = a.toLowerCase().startsWith(b)
/**
* finally, returns result of above test
*/
return result
}`
      );
    });

    it('invokes', async function () {
      assert.isFalse(deserialized('AardVark', 'vark'));
      assert.isTrue(deserialized('aardvark', 'aard'));
    });

    it('checksum works', async function () {
      await deserialize(serialized, { hash: true });
      serialized.params.push('c');
      try {
        await deserialize(serialized, { hash: true });
      } catch(err) {
        assert.include(`${err}`, 'Checksum failed');
        return;
      }
      assert.fail('should have failed checksum');
    });

  });

  describe(`${testNum}O - Function with multiple lines of body and single-line comments`, function () {

    function singleLineCommentedInclude (a,b) {
      // first, converts argument `b` to all lower case
      b = b.toLowerCase()
      // second, tests that argument `a` starts with
      // new value of `b`
      const result = a.toLowerCase().startsWith(b)
      // finally, returns result of above test
      return result
    }
    let serialized, deserialized;

    it('serializes with comments removed by default', async function () {
      serialized = await serialize(singleLineCommentedInclude, { hash: true });
      assert.deepEqual(
        serialized,
        {
          params: ['a','b'],
          body: `b = b.toLowerCase()
const result = a.toLowerCase().startsWith(b)
return result`,
          type: 'Function',
          hash: '753d60b82acae70722b0d95a0ac95cb5b80ce00c05cd4b569250cdd3a7376088',
        }
      );
    });

    it('serializes preserving comments on demand', async function () {
      serialized = await serialize(singleLineCommentedInclude, { hash: true, comments: true });
      assert.deepEqual(
        serialized,
        {
          params: ['a','b'],
          body: `// first, converts argument \`b\` to all lower case
b = b.toLowerCase()
// second, tests that argument \`a\` starts with
// new value of \`b\`
const result = a.toLowerCase().startsWith(b)
// finally, returns result of above test
return result`,
          type: 'Function',
          hash: 'f0a1dfc4e11580e69ef9cf9a98cbb231feaee278c42d6eb19b5bd03bc2db7567',
        }
      );
    });

    it('deserializes restoring comments', async function () {
      deserialized = await deserialize(serialized);
      assert.equal(
        deserialized.toString(),
        `function anonymous(a,b
) {
// first, converts argument \`b\` to all lower case
b = b.toLowerCase()
// second, tests that argument \`a\` starts with
// new value of \`b\`
const result = a.toLowerCase().startsWith(b)
// finally, returns result of above test
return result
}`
      );
    });

    it('invokes', async function () {
      assert.isFalse(deserialized('AardVark', 'vark'));
      assert.isTrue(deserialized('aardvark', 'aard'));
    });

    it('checksum works', async function () {
      await deserialize(serialized, { hash: true });
      serialized.params.push('c');
      try {
        await deserialize(serialized, { hash: true });
      } catch(err) {
        assert.include(`${err}`, 'Checksum failed');
        return;
      }
      assert.fail('should have failed checksum');
    });

  });

  describe(`${testNum}P - Function with multiple lines of body and extraneous whitespace`, function () {

    function spacedCommentedInclude (a,b) {

      // lots of comments (will be removed)
        b = b.toLowerCase()

          /** and each uncommented line 
           * increasingly indented
           */
            const result = a.toLowerCase().startsWith(b)

              // why would anyone do such a thing
                return result

    }
    let serialized, deserialized;

    it('serializes with whitespace removed by default', async function () {
      serialized = await serialize(spacedCommentedInclude, { hash: true });
      assert.deepEqual(
        serialized,
        {
          params: ['a','b'],
          body: `b = b.toLowerCase()
const result = a.toLowerCase().startsWith(b)
return result`,
          type: 'Function',
          hash: '753d60b82acae70722b0d95a0ac95cb5b80ce00c05cd4b569250cdd3a7376088',
        }
      );
    });

    it('serializes preserving whitespace on demand', async function () {
      serialized = await serialize(spacedCommentedInclude, { hash: true, whitespace: true });
      assert.deepNestedInclude(
        serialized,
        {
          params: ['a','b'],
          type: 'Function',
        }
      );
      assert.deepEqual(
        serialized.body.split(/\r?\n/),
        `

      
        b = b.toLowerCase()

          
            const result = a.toLowerCase().startsWith(b)

              
                return result

    `.split(/\r?\n/)
      );
      assert.include(
        [
          '0dad83ca3698a185ea1dd6e050869bb295f0eb74bd89d21ed586576b100d6cfe',
          '2315a19338448d12397d6259a1784637f01463b0de07d59bd7a94fb312202840'
        ],
        serialized.hash
      );
    });

    it('deserializes restoring whitespace', async function () {
      deserialized = await deserialize(serialized);
      assert.deepEqual(
        deserialized.toString().split(/\r?\n/),
        `function anonymous(a,b
) {


      
        b = b.toLowerCase()

          
            const result = a.toLowerCase().startsWith(b)

              
                return result

    
}`.split(/\r?\n/)
      );
    });

    it('invokes', async function () {
      assert.isFalse(deserialized('AardVark', 'vark'));
      assert.isTrue(deserialized('aardvark', 'aard'));
    });

    it('checksum works', async function () {
      await deserialize(serialized, { hash: true });
      serialized.params.push('c');
      try {
        await deserialize(serialized, { hash: true });
      } catch(err) {
        assert.include(`${err}`, 'Checksum failed');
        return;
      }
      assert.fail('should have failed checksum');
    });

  });

  describe(`${testNum}Q - Function with embedded comments within template literals`, function () {

    function stringLiteralComments (a,b) {
      const x = `${/* before */ a + b /* and after */}`;
      const y = `${
        // before
        a * b
        // and after
      }`;

      return `${
        /**
         * multi comment
         */
        [ // single comment
          x,
          Number(y).toFixed(2),
        ].join('\n')
      }`;
    }
    let serialized, deserialized;

    it('serializes with comments removed by default', async function () {
      serialized = await serialize(stringLiteralComments, { hash: true });
      assert.deepEqual(
        serialized,
        {
          params: ['a','b'],
          body: `const x = \`\${ a + b }\`;
const y = \`\${
a * b
}\`;
return \`\${
[
x,
Number(y).toFixed(2),
].join('\\n')
}\`;`,
          type: 'Function',
          hash: 'd0410e3949040d1c4b58c7a901e7e119019306fd9d8d05527e9adad5a1fe00f3',
        }
      );
    });

    it('serializes preserving comments on demand', async function () {
      serialized = await serialize(stringLiteralComments, { hash: true, comments: true });
      assert.deepEqual(
        serialized,
        {
          params: ['a','b'],
          body: `const x = \`\${/* before */ a + b /* and after */}\`;
const y = \`\${
// before
a * b
// and after
}\`;
return \`\${
/**
* multi comment
*/
[ // single comment
x,
Number(y).toFixed(2),
].join('\\n')
}\`;`,
          type: 'Function',
          hash: 'bea71518987ac8bb833801fefe9d64198474f6826115ab26c5637df2e3187d8d',
        }
      );
    });

    it('deserializes restoring comments', async function () {
      deserialized = await deserialize(serialized);
      assert.equal(
        deserialized.toString(),
        `function anonymous(a,b
) {
const x = \`\${/* before */ a + b /* and after */}\`;
const y = \`\${
// before
a * b
// and after
}\`;
return \`\${
/**
* multi comment
*/
[ // single comment
x,
Number(y).toFixed(2),
].join('\\n')
}\`;
}`
      );
    });

    it('invokes', async function () {
      assert.equal(deserialized(5, 7.5), '12.5\n37.50');
    });

    it('checksum works', async function () {
      await deserialize(serialized, { hash: true });
      serialized.params.push('c');
      try {
        await deserialize(serialized, { hash: true });
      } catch(err) {
        assert.include(`${err}`, 'Checksum failed');
        return;
      }
      assert.fail('should have failed checksum');
    });

  });

  describe(`${testNum}R - Function with string resembling comments`, function () {

    function stringsNotComments () {
      // a real comment
      return ' foo /* not a real comment */ bar ';
      /* also a real comment */
    }
    let serialized, deserialized;

    it('serializes with strings intact', async function () {
      serialized = await serialize(stringsNotComments, { hash: true });
      assert.deepEqual(
        serialized,
        {
          params: [],
          body: `return ' foo /* not a real comment */ bar ';`,
          type: 'Function',
          hash: '94f975ff751f26789183008ac35b6d81fdf9db0d9714560d89583d8b57db0a77',
        }
      );
    });

    it('deserializes with strings intact', async function () {
      deserialized = await deserialize(serialized);
      assert.equal(
        deserialized.toString(),
        `function anonymous(
) {
return ' foo /* not a real comment */ bar ';
}`
      );
    });

    it('invokes', async function () {
      assert.equal(deserialized(), ' foo /* not a real comment */ bar ');
    });

    it('checksum works', async function () {
      await deserialize(serialized, { hash: true });
      serialized.params.push('c');
      try {
        await deserialize(serialized, { hash: true });
      } catch(err) {
        assert.include(`${err}`, 'Checksum failed');
        return;
      }
      assert.fail('should have failed checksum');
    });

  });

  describe(`${testNum}S - Function with regex resembling comments`, function () {

    function regexNotComments (x) {
      // a real comment
      return /[/*.*/]/.test(x);
      /* also a real comment */
    }
    let serialized, deserialized;

    it('serializes with regular expressions intact', async function () {
      serialized = await serialize(regexNotComments, { hash: true });
      assert.deepEqual(
        serialized,
        {
          params: ['x'],
          body: `return /[/*.*/]/.test(x);`,
          type: 'Function',
          hash: '0afde372682cb436c0d96a964de8124922c35539e28aa06a05274230c6ba6bf1',
        }
      );
    });

    it('deserializes with regular expressions intact', async function () {
      deserialized = await deserialize(serialized);
      assert.equal(
        deserialized.toString(),
        `function anonymous(x
) {
return /[/*.*/]/.test(x);
}`
      );
    });

    it('invokes', async function () {
      assert.isTrue(deserialized('/'));
      assert.isFalse(deserialized('!'));
    });

    it('checksum works', async function () {
      await deserialize(serialized, { hash: true });
      serialized.params.push('c');
      try {
        await deserialize(serialized, { hash: true });
      } catch(err) {
        assert.include(`${err}`, 'Checksum failed');
        return;
      }
      assert.fail('should have failed checksum');
    });

  });

  describe(`${testNum}T - Deep serialization`, function () {

    const struct = {
      foo: [
        1, 2, 3,
        function (x,y) { return x * y; }
      ],
      bar: {
        alpha: 'a',
        bravo: 'b',
        echo: (x,y,z) => ((x + y) * z)
      },
      baz: new Date(),
      bob: BigInt(987),
      bill: (x,y) => ({ x, y, z: x ** y }),
      beau: new Set([
        (x,y) => x % y
      ]),
      beck: new Map([
        [
          1,
          (x,y) => { return x / y; }
        ]
      ]),
    };
    let serialized, deserialized;

    it('deeply serializes functions and clones objects', async function () {
      serialized = await deepSerialize(struct, { hash: true });
      
      // ensure all objects describing serialized functions
      let subjects = [
        [ '.foo.at(-1)', serialized.foo.at(-1) ],
        [ '.bar.echo', serialized.bar.echo ],
        [ '.bill', serialized.bill ],
        [ '(.beau.values()).next().value', (serialized.beau.values()).next().value ],
        [ '.beck.get(1)', serialized.beck.get(1) ],
      ];
      for (let [name, subject] of subjects) {
        assert.isObject(subject, `should be an object (${name})`);
        assert.isNotFunction(subject, `should NOT be a function (${name})`);
        assert.property(subject, 'params', `should have a params prop (${name})`);
        assert.property(subject, 'body', `should have a body prop (${name})`);
        assert.property(subject, 'type', `should have a type prop (${name})`);
        assert.property(subject, 'hash', `should have a hash prop (${name})`);
      }

      // ensure all different from their values in the original
      assert.notEqual(serialized.foo, struct.foo, 'should have different foo props');
      assert.notEqual(serialized.bar, struct.bar, 'should have different bar props');
      assert.notEqual(serialized.baz, struct.baz, 'should have different baz props');

      // ensure primitive types are equal to their original
      assert.equal(serialized.foo.at(1), struct.foo.at(1), 'should have equivalent foo[1] elements');
      assert.equal(serialized.bar.alpha, struct.bar.alpha, 'should have equivalent bar.alpha props');
      assert.equal(serialized.baz.toISOString(), struct.baz.toISOString(), 'should have equivalent baz ISO string values');
      assert.equal(serialized.bob, struct.bob, 'should have equivalent bob props');
    });

    it('deeply deserializes functions and, again, clones objects', async function () {
      deserialized = await deepDeserialize(struct, { hash: true });
      
      // ensure all invokable functions
      let subjects = [
        [ '.foo.at(-1)', deserialized.foo.at(-1) ],
        [ '.bar.echo', deserialized.bar.echo ],
        [ '.bill', deserialized.bill ],
        [ '(.beau.values()).next().value', (deserialized.beau.values()).next().value ],
        [ '.beck.get(1)', deserialized.beck.get(1) ],
      ];
      for (let [name, subject] of subjects) {
        assert.isFunction(subject, `should be a function (${name})`);
      }

      // ensure all different from their values in the serialized
      assert.notEqual(deserialized.foo, serialized.foo, 'should have different foo props');
      assert.notEqual(deserialized.bar, serialized.bar, 'should have different bar props');
      assert.notEqual(deserialized.baz, serialized.baz, 'should have different baz props');

      // ensure primitive types are equal to the serialized
      assert.equal(deserialized.foo.at(1), serialized.foo.at(1), 'should have equivalent foo[1] elements');
      assert.equal(deserialized.bar.alpha, serialized.bar.alpha, 'should have equivalent bar.alpha props');
      assert.equal(deserialized.baz.toISOString(), serialized.baz.toISOString(), 'should have equivalent baz ISO string values');
    });

  });

});
