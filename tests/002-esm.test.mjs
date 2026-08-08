import { config as chaiConfig, assert } from 'chai';

chaiConfig.truncateThreshold = 0;

describe('002A - esm imports', function () {
  it('import named', async function () {
    const {
      serialize, deserialize,
      deepSerialize, deepDeserialize,
      SerializeError, DeserializeError, CryptoError,
    } = await import('../dist/import.mjs');

    assert.isFunction(serialize);
    assert.isFunction(deserialize);

    assert.isFunction(deepSerialize);
    assert.isFunction(deepDeserialize);

    assert.instanceOf(SerializeError.prototype, Error);
  });

  it('import default', async function () {
    const importedDefault = (await import('../dist/import.mjs')).default;

    assert.property(importedDefault, 'serialize');
    assert.isFunction(importedDefault.serialize);
    assert.property(importedDefault, 'deserialize');
    assert.isFunction(importedDefault.deserialize);

    assert.property(importedDefault, 'deepSerialize');
    assert.isFunction(importedDefault.deepSerialize);
    assert.property(importedDefault, 'deepDeserialize');
    assert.isFunction(importedDefault.deepDeserialize);

    assert.property(importedDefault, 'SerializeError');
    assert.instanceOf(importedDefault.SerializeError.prototype, Error);
  });
});
