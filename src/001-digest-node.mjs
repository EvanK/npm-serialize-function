// eslint-disable-next-line no-unused-vars
async function digest(input) {
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(input).digest('hex');
}
