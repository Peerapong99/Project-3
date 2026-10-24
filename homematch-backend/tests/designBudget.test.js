const {test} = require('node:test');
const assert = require('node:assert/strict');
const {parseBudget,calculateBudget} = require('../../HomeMatchMobile/src/utils/designBudget');

test('budget input distinguishes empty, zero and invalid amounts', () => {
  assert.deepEqual(parseBudget(''),{value:null,error:''});
  assert.equal(parseBudget('0').value,0);
  assert.equal(parseBudget('100000.25').value,100000.25);
  for (const value of ['-1','NaN','Infinity','1.001','1e6','abc','999999999999999999']) assert.ok(parseBudget(value).error);
});
test('budget computes exact remaining/overspend and clamps progress including zero budget', () => {
  assert.equal(calculateBudget(29.9,30).remaining,0.1);
  assert.equal(calculateBudget(30.1,30).overBudget,0.1);
  assert.equal(calculateBudget(200,100).progress,1);
  assert.equal(calculateBudget(200,100).percentage,200);
  assert.equal(calculateBudget(0,0).isOverBudget,false);
  assert.equal(calculateBudget(1,0).isOverBudget,true);
  assert.equal(calculateBudget(1,0).progress,1);
  assert.equal(calculateBudget(1,null),null);
});

test('snapshot persistence, price changes, ownership and concurrent edits (mock database)', async t => {
  const express = require('express');
  const mongoose = require('mongoose');
  const jwt = require('jsonwebtoken');
  const User = require('../src/models/User');
  const RoomDesign = require('../src/models/RoomDesign');
  const Catalog = require('../src/models/DesignCatalogItem');
  const owner = new mongoose.Types.ObjectId().toString(), other = new mongoose.Types.ObjectId().toString(), id = new mongoose.Types.ObjectId().toString();
  const prior = process.env.JWT_SECRET;process.env.JWT_SECRET='budget-tests-only';
  let price = 100, writes = 0, concurrent = false;
  let saved = {_id:id,userId:owner,propertyId:new mongoose.Types.ObjectId().toString(),floor:'1',roomId:'room',room:'Test',updatedAt:new Date('2026-01-01T00:00:00.000Z'),furniture:[{id:'1',type:'bed',x:10,y:20,width:60,height:80,rotation:90,realWidth:1,realHeight:2}],selectedFloor:{id:'tile'},selectedWall:{id:'white'}};
  t.mock.method(User,'findById',async value => ({_id:value,role:'buyer'}));
  function resultQuery(result) {
    return {lean:async () => structuredClone(result),populate:() => ({lean:async () => structuredClone(result)}),then:(resolve,reject) => Promise.resolve(structuredClone(result)).then(resolve,reject)};
  }
  t.mock.method(RoomDesign,'findOne',query => resultQuery(String(query.userId) === owner && (query._id === id || query.propertyId === saved.propertyId) ? saved : null));
  t.mock.method(require('../src/models/Property'),'findOne',()=>({select:()=>({lean:async()=>({floorPlans:[{floor:1,rooms:[{_id:'room'}]}]})})}));
  t.mock.method(Catalog,'find',() => ({lean:async () => [{category:'furniture',key:'bed',unitPrice:price,priceSource:'Test reference'}]}));
  t.mock.method(RoomDesign,'findOneAndUpdate',(query,update) => {
    if (query._id && (concurrent || String(query.userId) !== owner || new Date(query.updatedAt).getTime() !== new Date(saved.updatedAt).getTime())) return resultQuery(null);
    writes++;
    saved = {...saved,...structuredClone(update.$set),updatedAt:new Date(new Date(saved.updatedAt).getTime() + 1000)};
    return resultQuery(saved);
  });
  const app=express();app.use(express.json());app.use('/api/room-designs',require('../src/routes/roomDesignRoutes'));
  app.use((e,req,res,next) => res.status(e.status || 500).json({message:e.message}));
  const server=await new Promise(resolve => {const instance=app.listen(0,'127.0.0.1',()=>resolve(instance));});
  try {
    async function request(user, method='GET', body, path=`/${id}/price-summary`) {
      const headers={'Content-Type':'application/json'};
      if (user) headers.Authorization='Bearer '+jwt.sign({id:user},process.env.JWT_SECRET);
      const response=await fetch(`http://127.0.0.1:${server.address().port}/api/room-designs${path}`,{method,headers,body:body === undefined ? undefined : JSON.stringify(body)});
      return {status:response.status,data:await response.json()};
    }
    const payload=() => ({designName:' Bedroom ',budget:150,expectedUpdatedAt:new Date(saved.updatedAt).toISOString(),estimatedTotal:999999,priceSnapshot:{grandTotal:999999}});
    assert.equal((await request(null,'PATCH',payload())).status,401);
    assert.equal((await request(other,'PATCH',payload())).status,404);
    for (const budget of [-1,'100',1.001]) assert.equal((await request(owner,'PATCH',{...payload(),budget})).status,400);
    assert.equal((await request(owner,'PATCH',{...payload(),designName:''})).status,400);
    const before=structuredClone(saved.furniture);
    const first=await request(owner,'PATCH',payload());
    assert.equal(first.status,200);assert.equal(first.data.design.designName,'Bedroom');
    assert.equal(saved.estimatedTotal,100);assert.equal(saved.priceSnapshot.grandTotal,100);
    assert.deepEqual(saved.furniture,before);assert.equal(saved.budget,150);
    price=200;
    const read=await request(owner);
    assert.equal(read.data.summarySource,'saved');assert.equal(read.data.summary.grandTotal,100);assert.equal(read.data.currentSummary.grandTotal,200);
    assert.equal((await request(owner,'PATCH',{...payload(),expectedUpdatedAt:'2026-01-01T00:00:00.000Z'})).status,409);
    concurrent=true;
    assert.equal((await request(owner,'PATCH',payload())).status,409);
    assert.equal(writes,1);concurrent=false;
    assert.equal((await request(owner,'PATCH',{...payload(),budget:0})).status,200);
    assert.equal(saved.priceSnapshot.grandTotal,200);assert.equal(saved.budget,0);
    const editorBody={expectedUpdatedAt:new Date(saved.updatedAt).toISOString(),propertyId:saved.propertyId,floor:saved.floor,roomId:saved.roomId,room:saved.room,roomSize:{width:5,height:6,unit:'meter'},selectedFloor:saved.selectedFloor,selectedWall:saved.selectedWall,furniture:before};
    assert.equal((await request(owner,'PUT',editorBody,'/')).status,200);
    assert.equal(saved.priceSnapshot,null);assert.equal(saved.estimatedTotal,null);
    assert.equal(saved.designName,'Bedroom');assert.equal(saved.budget,0);
    assert.deepEqual(saved.furniture.map(x => ({id:x.id,x:x.x,y:x.y,rotation:x.rotation})),before.map(x => ({id:x.id,x:x.x,y:x.y,rotation:x.rotation})));
  } finally {
    await new Promise(resolve => server.close(resolve));
    if (prior === undefined) delete process.env.JWT_SECRET;else process.env.JWT_SECRET=prior;
  }
});