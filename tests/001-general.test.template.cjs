const realCrypto = require('node:crypto');
const { config: chaiConfig, assert } = require('chai');
const proxyquire = require('proxyquire');
const sinon = require('sinon');

chaiConfig.truncateThreshold = 0;

// prepare for stubbing/calling through to node:crypto
const cryptoStub = sinon.stub();
// proxy the test subjects and use pre-proxied hasher
const { serialize, deserialize } = proxyquire('../dist/main.js', {
  'node:crypto': {
    createHash: cryptoStub
  },
});

// switching between real and stubbed crypto
function useRealCrypto() {
  cryptoStub.callsFake((...args) => realCrypto.createHash(...args));
};
function useStubbedCrypto() {
  cryptoStub.reset();

  return cryptoStub;
}

const testNum = '001';

/** actual tests go here **/
