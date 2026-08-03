/**
 * Covers failures stringifying serialized function for hashing purposes
 * @extends {Error}
 */
class JsonError extends Error {};
/**
 * Covers failures generating SHA hash digest
 * @extends {Error}
 */
class CryptoError extends Error {};
/**
 * Covers general failures during serialization
 * @extends {Error}
 */
class SerializeError extends Error {};
/**
 * Covers general failures during deserialization
 * @extends {Error}
 */
class DeserializeError extends Error {};
/**
 * Covers failures matching checksum to SHA hash
 * @extends {Error}
 */
class ChecksumError extends Error {};
/**
 * Covers failures reconstructing a function during deserialization
 * @extends {Error}
 */
class ConstructError extends Error {};

// function constructors (vanilla `Function` already global)
const AsyncFunction = async function () {}.constructor;
const Generator = function* () {}.constructor;
const AsyncGenerator = async function* () {}.constructor;

// matching stringified functions, by respective types, into named capture groups
const formatPatterns = {
  'Generator': /^(?<isAsync>async\s+)?function\*\s*[^()]*\((?<params>[^)]*)\)\s*{(?<body>[\s\S]*)}$/,
  'Function':  /^(?<isAsync>async\s+)?function\s*[^()]*\((?<params>[^)]*)\)\s*{(?<body>[\s\S]*)}$/,
  // 1st group is async
  // 2nd group is param list
  // 3rd group is braced body
  'ArrowFunction': /^(?<isAsync>async\s+)?(?:\((?<params>[^)]*)\)|(?<singleParam>[^=\s(]+))\s*=>\s*(?:{(?<bracedBody>[\s\S]*)}|(?<bodyExpr>[\s\S]+))$/,
  // 1st group is async | undefined
  // 2nd group is param list | undefined
  // 3rd group is single param | undefined
  // 4th group is braced body | undefined
  // 5th group is body expression | undefined
};

// get a sha hash given an object
async function hasher(obj) {
  let json, hashed;

  try {
    json = JSON.stringify(obj);
  } catch (cause) {
    throw new JsonError('Failed to stringify serialized function structure', { cause })
  }

  try {
    /* eslint-disable-next-line no-unsafe-optional-chaining */
    const hashBuffer = await (globalThis?.crypto?.subtle ?? window?.crypto?.subtle).digest(
      'SHA-256',
      new TextEncoder().encode(json)
    );

    hashed = Array.from(new Uint8Array(hashBuffer))
      .map((item) => item.toString(16).padStart(2, '0'))
      .join('')
    ;
  } catch (cause) {
    throw new CryptoError('Failed to generate hash digest', { cause });
  }

  return hashed;
}

// map a type str to the proper constructor
function getConstructor(type) {
  switch (type) {
    case 'Function':
    case 'ArrowFunction':
      return Function;
    case 'AsyncFunction':
    case 'AsyncArrowFunction':
      return AsyncFunction;
    case 'Generator':
      return Generator;
    case 'AsyncGenerator':
      return AsyncGenerator;
    default:
      throw new ConstructError(`Unexpected type ${type}`);
  }
}

// shamelessly borrowed from: https://j11y.io/javascript/removing-comments-in-javascript/
function removeComments(input) {
  // working copy of input as an array, with a leading/trailing buffer
  let [...output] = `__${input}__`;

  // state tracking
  const mode = {
    singleQuote: false,
    doubleQuote: false,
    regex: false,
    blockComment: false,
    lineComment: false,
  };

  // work character by character
  for (let i = 0, l = output.length; i < l; i++) {

    if (mode.regex) {
      if (output[i] === '/' && output[i-1] !== '\\') mode.regex = false;
      continue;
    }

    if (mode.singleQuote) {
      if (output[i] === '\'' && output[i-1] !== '\\') mode.singleQuote = false;
      continue;
    }

    if (mode.doubleQuote) {
      if (output[i] === '"' && output[i-1] !== '\\') mode.doubleQuote = false;
      continue;
    }

    if (mode.blockComment) {
      if (output[i] === '*' && output[i+1] === '/') {
        output[i+1] = '';
        mode.blockComment = false;
      }
      output[i] = '';
      continue;
    }

    if (mode.lineComment) {
      if (output[i+1] === '\n' || output[i+1] === '\r') mode.lineComment = false;
      output[i] = '';
      continue;
    }

    mode.doubleQuote = output[i] === '"';
    mode.singleQuote = output[i] === '\'';

    if (output[i] === '/') {
      if (output[i+1] === '*') {
        output[i] = '';
        mode.blockComment = true;
        continue;
      }
      if (output[i+1] === '/') {
        output[i] = '';
        mode.lineComment = true;
        continue;
      }
      mode.regex = true;
    }

  }

  return output.join('').slice(2, -2);
}

/**
 * Invokable function object
 * 
 * @typedef {Function|Generator|AsyncGenerator} InvokableFunction
 */

/**
 * Object notation for serialized functions
 * 
 * @typedef {object} SerializedFunction
 * @property {array} params Function parameters
 * @property {string} body Function body
 * @property {string} type Function type
 * @property {string?} hash Cryptographic hash
 */

/**
 * Options for function serialization
 * 
 * @typedef {object} SerializeOptions
 * @property {boolean} [comments=false] Preserves comments
 * @property {boolean} [whitespace=false] Preserves whitespace
 * @property {boolean} [hash=false] Enables SHA256 hashing of function being serialized
 */

/**
 * Options for function deserialization
 * 
 * @typedef {object} DeserializeOptions
 * @property {boolean} [hash=false] Enables SHA256 validating of serialized function's hash
 */

/**
 * Serializes a given function to an object notation
 * 
 * @param {InvokableFunction} func Function to be serialized
 * @param {SerializeOptions?} opts Serialization options
 * @returns {Promise<SerializedFunction>}
 * @throws {SerializeError}
 */
async function serialize(func, opts) {
  const def = { hash: false, comments: false, whitespace: false };
  opts = (typeof opts === 'object' && null !== opts)
    ? Object.assign({}, def, opts)
    : Object.assign({}, def)
  ;
  const typed = typeof func;
  if (typed !== 'function') {
    throw new SerializeError('Invalid argument type, must be a function', {
      cause: {
        'typeof': typed
      }
    });
  }

  let stringified = func.toString();

  // strip any comments
  if (!opts.comments) {
    stringified = removeComments(stringified);
  }

  // strip leading/trailing whitespace from each line
  if (!opts.whitespace) {
    stringified = stringified
      .split(/[\r\n]+/)
      .map(line => line.trim())
      .filter(line => line !== '')
      .join('\n')
    ;
  }

  let match, serialized;

  for (const [type, pattern] of Object.entries(formatPatterns)) {
    try {
      match = stringified.match(pattern);
      if (match) {
        // is async?
        let async = match.groups.isAsync ? 'Async' : '';
        // params as string list
        let params = type === 'ArrowFunction'
          ? match.groups.params ?? match.groups.singleParam
          : match.groups.params
        ;
        // normalized into an array
        params = params.split(',').map((p) => opts.whitespace ? p : p.trim()).filter(Boolean);
        // body as string
        let body = type === 'ArrowFunction'
          ? match.groups.bracedBody ?? `return (${match.groups.bodyExpr});`
          : match.groups.body
        ;
        // trimmed of extra whitespace
        if (!opts.whitespace) body = body.trim();

        // create serialized json structure
        serialized = {
          params,
          body,
          type: `${async}${type}`,
        };
        break;
      }
    } catch (cause) {
      throw new SerializeError(`Unexpected error serializing ${type}`, { cause });
    }
  }

  if (!serialized) {
    throw new SerializeError('Unsupported function format', { cause: stringified });
  }

  if (opts.hash) {
    try {
      const hashed = await hasher(serialized);
      serialized.hash = hashed;
    } catch (cause) {
      throw new SerializeError('Failure hashing serialized function', { cause });
    }
  }

  return serialized;
}

/**
 * Deserializes a given object to an invokable function
 * 
 * @param {SerializedFunction} struct Function to be deserialized
 * @param {DeserializeOptions?} opts Deserialization options
 * @returns {Promise<InvokableFunction>}
 * @throws {DeserializeError|ChecksumError}
 */
async function deserialize(struct, opts = { hash: false }) {
  if (opts?.hash) {
    if (struct?.hash === undefined) {
      throw new DeserializeError('Deserialized function missing hash');
    }
    const test = Object.assign({}, struct);
    delete test.hash;

    try {
      const checksum = await hasher(test);
      if (checksum !== struct.hash) {
        throw new ChecksumError('Checksum failed', {
          cause: {
            a: checksum,
            b: struct.hash,
          }
        });
      }
    } catch (cause) {
      if (cause instanceof ChecksumError) throw cause;
      throw new DeserializeError('Failure generating checksum', { cause });
    }
  }

  try {
    const constructor = getConstructor(struct.type);
    return new constructor(...struct.params, struct.body);
  } catch (cause) {
    if (cause instanceof ConstructError) throw cause;
    throw new DeserializeError('Failure deserializing', { cause });
  }
}

/**
 * Traversing deep structures, to:
 * 1. clone every non-primitive type
 * 2. test each value for potential conversion (function to object, vice versa)
 * 3. convert each object that passes test
 * 4. return cloned and/or converted structure
 * 
 * @param {*} input Value to be deeply traversed
 * @param {function} tester Callback to test each value for conversion
 * @param {function} converter Callback to convert value
 * @returns {Promise<*>} Cloned value with conversions made
 * @ignore
 */
async function traverse(input, tester, converter) {
  // first step any time through is to test and convert
  if (tester(input)) {
    return await converter(input);
  }

  // return null or primitive types
  if (input === null || typeof input !== 'object') {
    return input;
  }

  // clone and return date objects
  if (input instanceof Date) {
    return new Date(input);
  }

  // iterate arrays
  if (input instanceof Array) {
    const cloned = [];
    for (let i = 0; i < input.length; i++) {
      // test and convert element
      if (tester(input[i])) cloned[i] = await converter(input[i]);
      // or traverse and (maybe) copy it 
      else cloned[i] = await traverse(input[i], tester, converter);
    }
    return cloned;
  }

  // iterate Sets
  if (input instanceof Set) {
    const cloned = new Set();
    for (const value of input) {
      // test and convert each iterated value
      if (tester(value)) cloned.add(await converter(value));
      // or traverse and (maybe) copy it
      else cloned.add(await traverse(value, tester, converter));
    }
    return cloned;
  }

  // iterate Maps and use .get/.set
  if (input instanceof Map) {
    const cloned = new Map();
    for (const [key, value] of input) {
      // test and convert each iterated value
      if (tester(value)) cloned.set(key, await converter(value));
      // or traverse and (maybe) copy it
      else cloned.set(key, await traverse(value, tester, converter));
    }
    return cloned;
  }

  // iterate objects
  if (input instanceof Object) {
    const cloned = Object.create(Object.getPrototypeOf(input));
    for (const key in input) {
      // skip inherited props
      if (Object.hasOwn(input, key)) {
        // test and convert each property
        if (tester(input[key])) cloned[key] = await converter(input[key]);
        // or traverse and (maybe) copy it
        else cloned[key] = await traverse(input[key], tester, converter);
      }
    }
    return cloned;
  }

  // return unmodified anything unanticipated
  return input;
}

/**
 * Accepts and traverses an input value of arbitrary depth, returning a copy with any
 * nested functions serialized in the process
 * 
 * @param {*} value Structure to deeply serialize
 * @param {SerializeOptions?} options Serialization options
 * @returns {Promise<*>}
 * @throws {SerializeError}
 */
async function deepSerialize(value, options) {
  try {
    return await traverse(
      value,
      (input) => typeof input === 'function',
      (input) => serialize(input, options)
    );
  } catch (cause) {
    throw new SerializeError(`Failure traversing and serializing`, { cause });
  }
}

/**
 * Accepts and traverses an input value of arbitrary depth, returning a copy with any
 * nested serialized functions deserialized in the process
 * 
 * @param {*} value Structure to deeply deserialize
 * @param {DeserializeOptions} options Deserialization options
 * @returns {Promise<*>}
 * @throws {DeserializeError}
 */
async function deepDeserialize(value, options) {
  try {
    return await traverse(
      value,
      (input) => typeof input === 'object' && Object.hasOwn(input, 'params') && Object.hasOwn(input, 'body') && Object.hasOwn(input, 'type'),
      (input) => deserialize(
        input,
        Object.assign(
          { hash: Object.hasOwn(input, 'hash') },
          options
        )
      )
    );
  } catch (cause) {
    throw new DeserializeError(`Failure traversing and deserializing`, { cause });
  }
}

export {
  serialize,
  deserialize,
  deepSerialize,
  deepDeserialize,

  JsonError,
  CryptoError,
  SerializeError,
  DeserializeError,
  ChecksumError,
  ConstructError,
};
