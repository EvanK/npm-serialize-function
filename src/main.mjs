// an error for each purpose, and a purpose for each error
class JsonError extends Error {};
class CryptoError extends Error {};
class SerializeError extends Error {}
class DeserializeError extends Error {}
class ChecksumError extends Error {}
class ConstructError extends Error {}

// function constructors (vanilla `Function` already global)
const AsyncFunction = async function () {}.constructor;
const Generator = function* () {}.constructor;
const AsyncGenerator = async function* () {}.constructor;

// would love to simplify w/ named captures, but javascript support is spotty
const formatPatterns = {
  'Generator': /^(async\s+)?function\*\s*[^()]*\(([^)]*)\)\s*{([\s\S]*)}$/,
  'Function':  /^(async\s+)?function\s*[^()]*\(([^)]*)\)\s*{([\s\S]*)}$/,
  // .1 is async
  // .2 is param list
  // .3 is braced body
  'ArrowFunction': /^(async\s+)?(?:\(([^)]*)\)|([^=\s(]+))\s*=>\s*(?:{([\s\S]*)}|([\s\S]+))$/,
  // .1 is "async " | undefined
  // .2 is param list | undefined
  // .3 is single param | undefined
  // .4 is braced body | undefined
  // .5 is body expression | undefined
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

// remove comments from stringified function
// borrowed from https://stackoverflow.com/a/32763310
function stripComments(str) {
  const RE_BLOCKS = new RegExp([
    /\/(\*)[^*]*\*+(?:[^*\/][^*]*\*+)*\//.source,
    /\/(\/)[^\n]*$/.source,
    /"(?:[^"\\]*|\\[\S\s])*"|'(?:[^'\\]*|\\[\S\s])*'/.source,
    /(?:[$\w\)\]]|\+\+|--)\s*\/(?![*\/])/.source,
    /\/(?=[^*\/])[^[/\\]*(?:(?:\[(?:\\.|[^\]\\]*)*\]|\\.)[^[/\\]*)*?\/[gim]*/.source
    ].join('|'),
    'gm'
  );

  return str.replace(RE_BLOCKS, function (match, mlc, slc) {
    return mlc
      ? '  '
      : slc
        ? ''
        : match
    ;
  });
}

function serialize(func, opts) {
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
    stringified = stripComments(stringified);
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
        let async = match[1] ? 'Async' : '';
        // params as string list
        let params = type === 'ArrowFunction'
          ? match[2] ?? match[3]
          : match[2]
        ;
        // normalized into an array
        params = params.split(',').map((p) => opts.whitespace ? p : p.trim()).filter(Boolean);
        // body as string
        let body = type === 'ArrowFunction'
          ? match[4] ?? `return (${match[5]});`
          : match[3]
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
    return hasher(serialized)
      .then(hashed => {
        serialized.hash = hashed;
        return serialized;
      })
      .catch(cause => {
        throw new SerializeError('Failure hashing serialized function', { cause });
      })
    ;
  }

  return serialized;
}

function deserialize(struct, opts = { hash: false }) {
  if (opts?.hash) {
    if (struct?.hash === undefined) {
      throw new DeserializeError('Deserialized function missing hash');
    }
    const test = Object.assign({}, struct);
    delete test.hash;
    return hasher(test)
      .then(checksum => {
        if (checksum !== struct.hash) {
          throw new ChecksumError('Checksum failed', {
            cause: {
              a: checksum,
              b: struct.hash,
            }
          });
        }
        return deserialize(struct, { hash: false });
      })
      .catch(cause => {
        if (cause instanceof ChecksumError || cause instanceof DeserializeError || cause instanceof ConstructError) {
          throw cause;
        }
        throw new DeserializeError('Failure generating checksum', { cause });
      })
    ;
  }

  try {
    const constructor = getConstructor(struct.type);
    return new constructor(...struct.params, struct.body);
  } catch (cause) {
    if (cause instanceof ConstructError) throw cause;
    throw new DeserializeError('Failure deserializing', { cause });
  }
}

export {
  serialize,
  deserialize,
};
