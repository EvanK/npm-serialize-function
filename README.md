# serialize-function

[
  ![ci status](https://github.com/EvanK/npm-serialize-function/actions/workflows/ci.yaml/badge.svg)
](https://github.com/EvanK/npm-serialize-function/actions/workflows/ci.yaml)
[
  ![Node.js supported and tested on v20 through v26](https://img.shields.io/badge/Node.js-v20%20--%20v26-seagreen?logo=nodedotjs "Node.js supported and tested on v20 through v26")
](https://nodejs.org/en/about/previous-releases)
[
  ![ECMAScript standard supported as of ES2023](https://img.shields.io/badge/ES-2023-dodgerblue "ECMAScript standard supported as of ES2023")
](https://compat-table.github.io/compat-table/es2016plus/)

[
  ![npm](https://nodei.co/npm/serialize-function.png)
](https://www.npmjs.com/package/serialize-function)

---

- [Quickstart](#quickstart)
- [Deep serialization](#deep-serialization)
- [Hashing](#hashing)
- [Whitespace and comments](#whitespace-and-comments)
- [Function type support](#function-type-support)
- [Changelog](#changelog)


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

const obj = await serialize(doTheThing);
console.log(obj);
// {
//   params: [ 'a', 'b', 'c', 'd', 'e' ],
//   body: 'return a + b * c / d % e;',
//   type: 'Function'
// }
```

Deserializes back into an invokable function:

```js
const func = await deserialize(obj);
console.log( func(1, 2, 3, 4, 5) );
// 2.5
```


## Deep serialization

You may want to deeply serialize _any_ functions nested at arbitrary levels of your data structures. The provided convenience functions will traverse and selectively clone any containing objects, while serializing any functions found:

```js
const { deepSerialize, deepDeserialize } = require('serialize-function');

const original = {
  foo: () => 'something',
  bar: [
    function* (seed = 0) { let n = seed; while(true) { n = n * 2; yield n; } }
  ],
  baz: new Date('2026-01-01')
}

const clone = await deepSerialize(original);
// {
//   foo: {
//     params: [],
//     body: "return ('something');",
//     type: 'ArrowFunction'
//   },
//   bar: [
//     {
//       params: [ 'seed = 0' ],
//       body: 'let n = seed; while(true) { n = n * 2; yield n; }',
//       type: 'Generator'
//     }
//   ],
//   baz: 2026-01-01T00:00:00.000Z
// }

// original container and functions remain unmodified
original.foo(); // 'something'
const gen1 = original.bar[0](3.14);
gen1.next().value; // 6.28
gen1.next().value; // 12.56

const restored = await deepDeserialize(clone);
// {
//   foo: [Function: anonymous],
//   bar: [ [GeneratorFunction: anonymous] ],
//   baz: 2026-01-01T00:00:00.000Z
// }

// deserialized functions remain invokable
restored.foo(); // 'something'
const gen2 = restored.bar[0](901364);
gen2.next().value; // 1802728
gen2.next().value; // 3605456
```


## Hashing

Optionally supports SHA256 checksum hashing to prevent MITM tampering:

```js
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

> Under the hood, hashing uses the [SubtleCrypto](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto) API.

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

const commentedObj = await serialize(thingNumberTwo, { whitespace: true, comments: true });
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
await serialize(
  (i,j,k) => ({ i, j, k })
);
// {
//   params: [ 'i', 'j', 'k' ],
//   body: 'return (({ i, j, k }));',
//   type: 'ArrowFunction'
// }

await serialize(
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

await serialize(
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

> [!NOTE]
> As there is no global `Class` object constructor, there is no way to safely deserialize [ES6 classes](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes).
>
> As such, ES6 classes are _not_ currently supported for serialization.
>
> Alternatively, you can rewrite your classes as functions, or transpile them with tools like [Babel](https://babeljs.io/docs/babel-plugin-transform-classes/).


## Changelog

Any potentially breaking changes will be documented here.

- 1.1.0 - Standardized both node and web builds on SubtleCrypto API
- 1.2.0 - Refactored comment stripping, to address potential regex DOS
- 2.0.0
    - Made all exported functions fully async
    - Implemented named captures for format patterns
    - Implemented deep de/serialization 
