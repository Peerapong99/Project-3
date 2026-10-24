const {test} = require('node:test');
const assert = require('node:assert/strict');
const {calculateDesignPrice} = require('../src/services/designPriceService');
const {mergeCatalog} = require('../src/services/designCatalogService');
const furniture = (id, type) => ({id,type,name:type,x:20,y:30,width:60,height:80,realWidth:1,realHeight:2,rotation:90});
const design = items => ({furniture:items,selectedFloor:{id:'tile'},selectedWall:{id:'white'},roomSize:{width:5,height:6}});

test('counts placed instances and ignores mobile price fields without mutating layout', () => {
  const input = design([{...furniture('1','bed'),unitPrice:999999},furniture('2','bed'),furniture('3','table')]);
  const before = structuredClone(input);
  const catalog = mergeCatalog([{category:'furniture',key:'bed',unitPrice:12.35},{category:'furniture',key:'table',unitPrice:5.2}]);
  const result = calculateDesignPrice(input,catalog);
  assert.equal(result.furnitureItems.find(x => x.key === 'bed').quantity,2);
  assert.equal(result.furnitureTotal,29.9);
  assert.equal(result.grandTotal,29.9);
  assert.deepEqual(input,before);
});
test('unknown prices and unknown types remain excluded, while explicit zero is priced', () => {
  const result = calculateDesignPrice(design([furniture('1','bed'),furniture('2','sofa'),furniture('3','legacy')]),mergeCatalog([{category:'furniture',key:'bed',unitPrice:0}]));
  assert.equal(result.furnitureItems[0].total,0);
  assert.equal(result.furnitureItems[1].total,null);
  assert.equal(result.furnitureItems[2].total,null);
  assert.equal(result.isComplete,false);
  assert.equal(result.unpricedItems.length,4);
});
test('calculates floor area from room dimensions and prices from the catalog', () => {
  const result = calculateDesignPrice(design([]),mergeCatalog([{category:'floor',key:'tile',unitPrice:20}]));
  const floor = result.materialItems.find(x => x.category === 'floor');
  assert.equal(floor.quantity,30);
  assert.equal(floor.unitPrice,20);
  assert.equal(floor.total,600);
  assert.equal(result.materialTotal,600);
  assert.equal(result.grandTotal,600);
});
test('prices all walls using room perimeter and standard 2.8 meter wall height', () => {
  const result = calculateDesignPrice(design([]),mergeCatalog([
    {category:'floor',key:'tile',unitPrice:850},
    {category:'wall',key:'white',unitPrice:180},
  ]));
  assert.equal(result.materialItems.find(x => x.category === 'floor').quantity,30);
  assert.equal(result.materialItems.find(x => x.category === 'wall').quantity,61.6);
  assert.equal(result.materialItems.find(x => x.category === 'wall').total,11088);
  assert.equal(result.materialTotal,36588);
  assert.equal(result.isComplete,true);
});
test('leaves material quantities unavailable when dimensions are absent and rejects invalid dimensions', () => {
  const input = design([]);
  delete input.roomSize;
  const result = calculateDesignPrice(input,mergeCatalog([{category:'floor',key:'tile',unitPrice:20}]));
  assert.equal(result.materialItems.find(x => x.category === 'floor').quantity,null);
  assert.equal(result.materialItems.find(x => x.category === 'floor').total,null);
  assert.throws(() => calculateDesignPrice({...design([]),roomSize:{width:-1,height:5}},[]));
});
test('rejects duplicate ids, invalid layout numbers, malformed data and unsafe totals', () => {
  for (const items of [[furniture('1','bed'),furniture('1','bed')],[{...furniture('1','bed'),x:-1}],[{...furniture('1','bed'),width:Infinity}],[null]]) {
    assert.throws(() => calculateDesignPrice(design(items),[]));
  }
  assert.throws(() => calculateDesignPrice({},[]));
  assert.throws(() => calculateDesignPrice(design([furniture('1','bed'),furniture('2','bed')]),[{category:'furniture',key:'bed',unitPrice:50000000000000}]));
});

test('summary endpoint authenticates and scopes query by design owner (mock database)', async t => {
  const express = require('express');
  const mongoose = require('mongoose');
  const jwt = require('jsonwebtoken');
  const User = require('../src/models/User');
  const RoomDesign = require('../src/models/RoomDesign');
  const Catalog = require('../src/models/DesignCatalogItem');
  const owner = new mongoose.Types.ObjectId().toString();
  const other = new mongoose.Types.ObjectId().toString();
  const id = new mongoose.Types.ObjectId().toString();
  const previous = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'summary-tests-only';
  const saved = {...design([furniture('1','bed')]),_id:id,userId:owner,propertyId:{_id:new mongoose.Types.ObjectId().toString(),title:'Test house',price:1000000}};
  t.mock.method(User,'findById',async value => ({_id:value,role:'buyer'}));
  t.mock.method(RoomDesign,'findOne',query => ({populate:() => ({lean:async () => query._id === id && String(query.userId) === owner ? saved : null})}));
  t.mock.method(Catalog,'find',() => ({lean:async () => [{category:'furniture',key:'bed',unitPrice:50}]}));
  const app = express();app.use(express.json());app.use('/api/room-designs',require('../src/routes/roomDesignRoutes'));
  app.use((e,req,res,next) => res.status(e.status || 500).json({message:e.message}));
  const server = await new Promise(resolve => {const instance=app.listen(0,'127.0.0.1',()=>resolve(instance));});
  try {
    async function request(user, designId = id) {
      const headers = user ? {Authorization:'Bearer '+jwt.sign({id:user},process.env.JWT_SECRET)} : {};
      const response = await fetch(`http://127.0.0.1:${server.address().port}/api/room-designs/${designId}/price-summary`,{headers});
      return {status:response.status,data:await response.json()};
    }
    assert.equal((await request(null)).status,401);
    assert.equal((await request(owner,'invalid')).status,400);
    assert.equal((await request(other)).status,404);
    const own = await request(owner);
    assert.equal(own.status,200);
    assert.equal(own.data.summary.grandTotal,50);
    assert.equal(own.data.design.propertyId.price,1000000);
    assert.deepEqual(own.data.design.furniture,saved.furniture);
  } finally {
    await new Promise(resolve => server.close(resolve));
    if (previous === undefined) delete process.env.JWT_SECRET;else process.env.JWT_SECRET=previous;
  }
});