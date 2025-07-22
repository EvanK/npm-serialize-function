class JsonError extends Error {};
class CryptoError extends Error {};

// eslint-disable-next-line no-unused-vars
async function hasher(obj) {
  let json, hashed;

  try {
    json = JSON.stringify(obj);
  } catch (cause) {
    throw new JsonError('Failed to stringify serialized function structure', { cause })
  }

  try {
    // eslint-disable-next-line no-undef
    hashed = await digest(json);
  } catch (cause) {
    throw new CryptoError('Failed to generate hash digest', { cause });
  }

  return hashed;
}
