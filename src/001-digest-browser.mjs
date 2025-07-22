// eslint-disable-next-line no-unused-vars
async function digest(input) {
  const hashBuffer = await window.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(input)
  );
  return Array.from(new Uint8Array(hashBuffer))
    .map((item) => item.toString(16).padStart(2, '0'))
    .join('')
  ;
}
