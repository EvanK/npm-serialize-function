import { config as chaiConfig, assert } from 'chai';

chaiConfig.truncateThreshold = 0;

describe('002A - esm imports', function () {
  it('import named', async function () {
    const { serialize, deserialize } = await import('../dist/import.mjs');

    assert.isFunction(serialize);
    assert.isFunction(deserialize);
  });

  it('import default', async function () {
    const importedDefault = (await import('../dist/import.mjs')).default;

    assert.property(importedDefault, 'serialize');
    assert.isFunction(importedDefault.serialize);
    assert.property(importedDefault, 'deserialize');
    assert.isFunction(importedDefault.deserialize);
  });
});
