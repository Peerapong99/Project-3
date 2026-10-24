const {test} = require('node:test');
const assert = require('node:assert/strict');
const {definitions, mergeCatalog, validatePriceInput} = require('../src/services/designCatalogService');
const CatalogItem = require('../src/models/DesignCatalogItem');

test('all existing editor assets have unique catalog keys and unknown default prices', () => {
  assert.equal(definitions.length, 22);
  assert.equal(new Set(definitions.map(x => `${x.category}:${x.key}`)).size, 22);
  assert.ok(mergeCatalog([]).every(x => x.unitPrice === null && x.priceStatus === 'missing'));
});
test('explicit zero is a known price; missing and corrupt prices remain unknown', () => {
  const items = mergeCatalog([{category:'furniture', key:'bed', unitPrice:0}, {category:'furniture',key:'sofa',unitPrice:-1}, {category:'floor',key:'tile',unitPrice:850.25}]);
  assert.equal(items.find(x => x.key === 'bed').priceStatus, 'available');
  assert.equal(items.find(x => x.key === 'sofa').unitPrice, null);
  assert.equal(items.find(x => x.key === 'tile').unitPrice, 850.25);
});
test('reject malformed/negative/unsafe prices and require price attribution', () => {
  for (const price of [-1, '100', '', false, undefined, NaN, Infinity, 1.001, Number.MAX_VALUE]) {
    assert.throws(() => validatePriceInput({unitPrice:price,priceSource:'test'}));
  }
  assert.throws(() => validatePriceInput({unitPrice:100,priceSource:''}));
  assert.deepEqual(validatePriceInput({unitPrice:100.25,priceSource:' reference '}), {unitPrice:100.25,priceSource:'reference'});
  assert.deepEqual(validatePriceInput({unitPrice:null,priceSource:''}), {unitPrice:null,priceSource:''});
});
test('database validation preserves null and rejects negative reference prices', async () => {
  assert.equal(new CatalogItem({category:'floor',key:'tile'}).unitPrice, null);
  await assert.rejects(new CatalogItem({category:'floor',key:'tile',unitPrice:-1}).validate());
  await new CatalogItem({category:'floor',key:'tile',unitPrice:10.25}).validate();
});
test('catalog API enforces JWT and admin writes without touching saved designs (mock database)', async t => {
  const express = require('express');
  const jwt = require('jsonwebtoken');
  const User = require('../src/models/User');
  const mongoose = require('mongoose');
  const buyerId = new mongoose.Types.ObjectId().toString();
  const adminId = new mongoose.Types.ObjectId().toString();
  const records = [];
  let writes = 0;
  const priorSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'catalog-tests-only';
  t.mock.method(User, 'findById', async id => id === buyerId ? {_id:buyerId,role:'buyer'} : id === adminId ? {_id:adminId,role:'admin'} : null);
  t.mock.method(CatalogItem, 'find', () => ({lean:async () => records}));
  t.mock.method(CatalogItem, 'findOneAndUpdate', async (query, update) => {
    writes++;
    const record = {...query, ...update.$set};
    records.splice(0, records.length, record);
    return record;
  });
  const app = express();
  app.use(express.json());
  app.use('/api/room-designs', require('../src/routes/roomDesignRoutes'));
  app.use((error, req, res, next) => res.status(error.status || 500).json({message:error.message}));
  const server = await new Promise(resolve => {const instance = app.listen(0, '127.0.0.1', () => resolve(instance));});
  try {
    const origin = `http://127.0.0.1:${server.address().port}/api/room-designs/catalog`;
    async function request(role, method = 'GET', body, suffix = '') {
      const headers = {'Content-Type':'application/json'};
      if (role) headers.Authorization = 'Bearer ' + jwt.sign({id:role === 'admin' ? adminId : buyerId}, process.env.JWT_SECRET);
      const response = await fetch(origin + suffix, {method, headers, body:body === undefined ? undefined : JSON.stringify(body)});
      return {status:response.status, data:await response.json()};
    }
    assert.equal((await request(null)).status, 401);
    const initial = await request('buyer');
    assert.equal(initial.status, 200);
    assert.equal(initial.data.items.length, 22);
    assert.ok(initial.data.items.every(x => x.unitPrice === null));
    assert.equal((await request('buyer','PUT',{unitPrice:100,priceSource:'test'},'/furniture/bed')).status,403);
    assert.equal(writes,0);
    assert.equal((await request('admin','PUT',{unitPrice:-1,priceSource:'test'},'/furniture/bed')).status,400);
    assert.equal((await request('admin','PUT',{unitPrice:100,priceSource:'test'},'/furniture/unknown')).status,404);
    assert.equal(writes,0);
    assert.equal((await request('admin','PUT',{unitPrice:100.25,priceSource:'test'},'/furniture/bed')).status,200);
    const priced = await request('buyer');
    assert.equal(priced.data.items.find(x => x.key === 'bed').unitPrice,100.25);
    assert.equal(writes,1);
    assert.equal((await request('admin','PUT',{unitPrice:null,priceSource:''},'/furniture/bed')).status,200);
    assert.equal((await request('buyer')).data.items.find(x => x.key === 'bed').unitPrice,null);
  } finally {
    await new Promise(resolve => server.close(resolve));
    if (priorSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = priorSecret;
  }
});