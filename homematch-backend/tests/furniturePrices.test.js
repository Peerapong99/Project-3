const {test}=require('node:test');
const assert=require('node:assert/strict');
const mongoose=require('mongoose');
const {MongoMemoryServer}=require('mongodb-memory-server');
const Item=require('../src/models/DesignCatalogItem');
const {defaults}=require('../src/services/furniturePriceDefaults');
const {seedFurniturePrices,seedDefaultDesignPrices,getDesignCatalog}=require('../src/services/designCatalogService');
const {calculateDesignPrice}=require('../src/services/designPriceService');

test('furniture estimate defaults cover all nine assets and calculate placed quantities',()=>{
 assert.equal(defaults.length,9);assert.equal(new Set(defaults.map(x=>x.key)).size,9);
 assert.ok(defaults.every(x=>Number.isSafeInteger(x.unitPrice) && x.unitPrice>0 && x.priceSource.includes('HomeMatch')));
 assert.equal(defaults.reduce((sum,item)=>sum+item.unitPrice,0),80990);
 const result=calculateDesignPrice({furniture:[{id:'one',type:'bed'},{id:'two',type:'bed'},{id:'three',type:'sofa'}]},defaults);
 assert.equal(result.furnitureTotal,44700);assert.equal(result.grandTotal,44700);assert.equal(result.isComplete,true);
});

test('seed fills missing furniture once and preserves admin overrides, zero and explicit null',{timeout:180000},async()=>{
 const db=await MongoMemoryServer.create();
 try {
  await mongoose.connect(db.getUri('furniture_price_defaults'));await Item.init();
  assert.equal((await seedFurniturePrices()).inserted,9);
  const furniture=(await getDesignCatalog()).filter(item=>item.category==='furniture');
  assert.equal(furniture.length,9);assert.ok(furniture.every(item=>item.priceStatus==='available'));
  assert.ok((await getDesignCatalog()).filter(item=>item.category!=='furniture').every(item=>item.unitPrice===null));
  assert.equal((await seedDefaultDesignPrices()).inserted,13);
  const catalog=await getDesignCatalog();
  const finishes=catalog.filter(item=>item.category!=='furniture');
  assert.equal(finishes.length,13);assert.ok(finishes.every(item=>item.priceStatus==='available'));
  assert.equal(catalog.find(item=>item.category==='floor' && item.key==='tile').unitPrice,850);
  assert.equal(catalog.find(item=>item.category==='wall' && item.key==='white').unitPrice,180);
  await Item.updateOne({category:'furniture',key:'bed'},{$set:{unitPrice:12345,priceSource:'Admin override'}});
  await Item.updateOne({category:'furniture',key:'sofa'},{$set:{unitPrice:null,priceSource:''}});
  await Item.updateOne({category:'furniture',key:'plant'},{$set:{unitPrice:0,priceSource:'Included free'}});
  await Item.updateOne({category:'wall',key:'white'},{$set:{unitPrice:250,priceSource:'Admin wall override'}});
  assert.equal((await seedDefaultDesignPrices()).inserted,0);
  const again=(await getDesignCatalog()).filter(item=>item.category==='furniture');
  assert.equal(again.find(x=>x.key==='bed').unitPrice,12345);
  assert.equal(again.find(x=>x.key==='sofa').unitPrice,null);
  assert.equal(again.find(x=>x.key==='plant').unitPrice,0);
  assert.equal((await getDesignCatalog()).find(x=>x.category==='wall' && x.key==='white').unitPrice,250);
 } finally {await mongoose.disconnect();await db.stop();}
});
