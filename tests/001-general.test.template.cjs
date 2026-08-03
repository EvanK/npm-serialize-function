const { config: chaiConfig, assert } = require('chai');
const proxyquire = require('proxyquire');
const sinon = require('sinon');

chaiConfig.truncateThreshold = 0;

// prepare for stubbing/calling through to node:crypto
const cryptoStub = sinon.stub();
// proxy the test subjects and use pre-proxied hasher
const { serialize, deserialize, deepSerialize, deepDeserialize } = proxyquire('../dist/main.js', {
  'node:crypto': {
    createHash: cryptoStub
  },
});

// switching between real and stubbed crypto
function useRealCrypto() {
  if (globalThis.crypto.subtle.digest?.restore) {
    globalThis.crypto.subtle.digest.restore();
  }
}

function useStubbedCrypto() {
  return sinon.stub(globalThis.crypto.subtle, 'digest');
}

const testNum = '001';

/** actual tests go here **/
