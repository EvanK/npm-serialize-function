# serialize-function

[
  ![ci status](https://github.com/EvanK/npm-serialize-function/actions/workflows/ci.yaml/badge.svg)
](https://github.com/EvanK/npm-serialize-function/actions/workflows/ci.yaml)
[
  ![node.js supported as of v20](https://img.shields.io/badge/Node.js-v20-yellow)
](https://nodejs.org/docs/latest-v20.x/api/)
[
  ![ECMAScript standard supported as of ES2023](https://img.shields.io/badge/ES-2023-green)
](https://compat-table.github.io/compat-table/es2016plus/)

[
  ![npm](https://nodei.co/npm/serialize-function.png)
](https://www.npmjs.com/package/serialize-function)


## Quickstart

Supports both CommonJS and ES Modules:

```js
const { serialize, deserialize } = require('serialize-function');
// or
import { serialize, deserialize } from 'serialize-function';
```

Serializes javascript functions to a JSON-encodable object suitable for storage to file or transfer over the wire:

```js
function doTheThing(a,b,c,d,e) { return a + b * c / d % e; }

const obj = serialize(doTheThing);
console.log(obj);
// {
//   params: [ 'a', 'b', 'c', 'd', 'e' ],
//   body: 'return a + b * c / d % e;',
//   type: 'Function'
// }
```

Deserializes back into an invokable function:

```js
const func = deserialize(obj);
console.log( func(1, 2, 3, 4, 5) );
// 2.5
```

## Hashing

Optionally supports SHA256 checksum hashing to prevent MITM tampering:

```js
// note: use of hashing returns a promise
const hashedObj = await serialize(doTheThing, { hash: true });
console.log(hashedObj);
// {
//   params: [ 'a', 'b', 'c', 'd', 'e' ],
//   body: 'return a + b * c / d % e;',
//   type: 'Function',
//   hash: '814fab043d5bcee7a589b1d73a9fb42a2d716c3f615056c41a062478e7844827'
// }

hashedObj.body = 'return doSomethingMalicious(...arguments);';
const tamperedFunc = await deserialize(hashedObj, { hash: true });
// ChecksumError: Checksum failed
```

> Under the hood, the browser-based implementation uses the [SubtleCrypto](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto) API, while the node implementation uses the built-in [crypto module](https://nodejs.org/docs/latest-v20.x/api/crypto.html).

## Whitespace and comments

Line breaks within the function body are preserved and normalized, but all other padding whitespace is removed from the function by default, along with any comments.

You can optionally preserve either or both, with the corresponding options:

```js
function thingNumberTwo(
  /* marco */
  a,   b,	c,
  d,e/* polo */
) {
  // add some things
  const sum = a + b;

  /* multiply by another thing */
  const product = sum * c;

  // divide by _another_
  // different thing
  const quotient = product / d;
  /*
    and modulus THAT thing
  */
  const remainder = quotient % e;
  return remainder;
}

const commentedObj = serialize(thingNumberTwo, { whitespace: true, comments: true });
console.log(commentedObj);
// {
//   params: [ '\n  /* marco */\n  a', '   b', '\tc', '\n  d', 'e/* polo */\n' ],
//   body: '\n' +
//     '  // add some things\n' +
//     '  const sum = a + b;\n' +
//     '\n' +
//     '  /* multiply by another thing */\n' +
//     '  const product = sum * c;\n' +
//     '\n' +
//     '  // divide by _another_\n' +
//     '  // different thing\n' +
//     '  const quotient = product / d;\n' +
//     '  /*\n' +
//     '    and modulus THAT thing\n' +
//     '  */\n' +
//     '  const remainder = quotient % e;\n' +
//     '  return remainder;\n',
//   type: 'Function'
// }
```

## Function type support

Arrow functions, generators, and all async variants are supported (contingent on _browser support_ where relevant):

```js
serialize(
  (i,j,k) => ({ i, j, k })
);
// {
//   params: [ 'i', 'j', 'k' ],
//   body: 'return (({ i, j, k }));',
//   type: 'ArrowFunction'
// }

serialize(
  function* (x,y,z) {
    yield x;
    yield y;
    yield z;
  }
);
// {
//   params: [ 'x', 'y', 'z' ],
//   body: 'yield x;\nyield y;\nyield z;',
//   type: 'Generator'
// }

serialize(
  async (ms) => new Promise( 
    resolve => setTimeout(resolve, ms)
  )
);
// {
//   params: [ 'ms' ],
//   body: 'return (new Promise(\nresolve => setTimeout(resolve, ms)\n));',
//   type: 'AsyncArrowFunction'
// }
```
