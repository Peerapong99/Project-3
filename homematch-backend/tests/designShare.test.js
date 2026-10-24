const {test}=require('node:test');
const assert=require('node:assert/strict');

test('sharing through existing Chat enforces ownership/property/membership and freezes the sent copy (mock database)',async t => {
  const express=require('express'),mongoose=require('mongoose'),jwt=require('jsonwebtoken');
  const User=require('../src/models/User'),Design=require('../src/models/RoomDesign'),Property=require('../src/models/Property');
  const Conversation=require('../src/models/Conversation'),Message=require('../src/models/Message'),Catalog=require('../src/models/DesignCatalogItem'),Notification=require('../src/models/Notification');
  const id=()=>new mongoose.Types.ObjectId().toString();
  const buyer=id(),seller=id(),outsider=id(),designId=id(),propertyId=id(),conversationId=id();
  const roles={[buyer]:'buyer',[seller]:'seller',[outsider]:'buyer'};
  const previous=process.env.JWT_SECRET;process.env.JWT_SECRET='share-tests-only';
  const conversation={_id:conversationId,buyer,seller,property:propertyId};
  let property={_id:propertyId,title:'Thai house',price:1000000,status:'approved',seller};
  let design={_id:designId,userId:buyer,propertyId,designName:'Bedroom',budget:200,room:'ห้องนอน',roomId:'room',floor:'1',updatedAt:new Date('2026-01-01T00:00:00Z'),selectedFloor:{id:'tile'},selectedWall:{id:'white'},furniture:[{id:'1',type:'bed',name:'เตียง',x:10,y:20,width:60,height:80,rotation:90,realWidth:1,realHeight:2}]};
  const messages=[];
  t.mock.method(User,'findById',async value=>({_id:value,role:roles[value]}));
  t.mock.method(Design,'findOne',query=>({lean:async()=>query._id===designId && String(query.userId)===buyer ? structuredClone(design) : null}));
  t.mock.method(Property,'findById',()=>({select:()=>({lean:async()=>structuredClone(property),then:(resolve,reject)=>Promise.resolve(property).then(resolve,reject)})}));
  t.mock.method(Conversation,'findById',value=>({lean:async()=>value===conversationId ? conversation : null,then:(resolve,reject)=>Promise.resolve(value===conversationId ? conversation : null).then(resolve,reject)}));
  t.mock.method(Conversation,'updateOne',async()=>({modifiedCount:1}));
  t.mock.method(Catalog,'find',()=>({lean:async()=>[{category:'furniture',key:'bed',unitPrice:100}]}));
  t.mock.method(Message,'create',async data=>{const message={...structuredClone(data),_id:id(),createdAt:new Date()};messages.push(message);return message;});
  t.mock.method(Message,'findById',value=>({populate:async()=>messages.find(x=>x._id===value)}));
  t.mock.method(Message,'findOne',query=>({lean:async()=>messages.find(x=>x._id===query._id && x.conversation===query.conversation) || null}));
  t.mock.method(Notification,'create',async()=>({}));
  const app=express();app.use(express.json());app.use('/api/chat',require('../src/routes/chatRoutes'));
  app.use((e,req,res,next)=>res.status(e.status || 500).json({message:e.message}));
  const server=await new Promise(resolve=>{const instance=app.listen(0,'127.0.0.1',()=>resolve(instance));});
  try {
    async function request(user,method,path,body) {
      const headers={'Content-Type':'application/json'};
      if(user) headers.Authorization='Bearer '+jwt.sign({id:user},process.env.JWT_SECRET);
      const response=await fetch(`http://127.0.0.1:${server.address().port}/api/chat${path}`,{method,headers,body:body===undefined ? undefined : JSON.stringify(body)});
      return {status:response.status,data:await response.json()};
    }
    const sendPath=`/conversations/${conversationId}/messages`;
    const payload=()=>({message:'Share',designId,expectedUpdatedAt:new Date(design.updatedAt).toISOString(),pricingMode:'current',sharedDesign:{summary:{grandTotal:999999}}});
    assert.equal((await request(null,'POST',sendPath,payload())).status,401);
    assert.equal((await request(outsider,'POST',sendPath,payload())).status,403);
    assert.equal((await request(seller,'POST',sendPath,payload())).status,403);
    assert.equal((await request(buyer,'POST',sendPath,{...payload(),designId:id()})).status,404);
    assert.equal((await request(buyer,'POST',sendPath,{...payload(),expectedUpdatedAt:'2020-01-01'})).status,409);
    const correctProperty=design.propertyId;design.propertyId=id();
    assert.equal((await request(buyer,'POST',sendPath,payload())).status,400);design.propertyId=correctProperty;
    property.seller=outsider;assert.equal((await request(buyer,'POST',sendPath,payload())).status,403);property.seller=seller;
    assert.equal(messages.length,0);
    const sent=await request(buyer,'POST',sendPath,payload());
    assert.equal(sent.status,201);assert.equal(sent.data.data.sharedDesign.summary.grandTotal,100);
    assert.equal(sent.data.data.sharedDesign.design.budget,200);
    const sharedPath=`/conversations/${conversationId}/messages/${sent.data.data._id}/design`;
    assert.equal((await request(outsider,'GET',sharedPath)).status,404);
    assert.equal((await request(seller,'GET',sharedPath.replace(conversationId,id()))).status,404);
    assert.equal((await request(seller,'GET',sharedPath)).status,200);
    const read=await request(buyer,'GET',sharedPath);assert.equal(read.status,200);
    assert.equal(read.data.design.userId,undefined);
    design.furniture[0].x=999;design.budget=999;
    const frozen=await request(seller,'GET',sharedPath);
    assert.equal(frozen.data.design.furniture[0].x,10);assert.equal(frozen.data.design.budget,200);
    // Ordinary text remains supported and cannot inject a forged shared payload.
    const text=await request(seller,'POST',sendPath,{message:'Hello',sharedDesign:{summary:{grandTotal:999999}}});
    assert.equal(text.status,201);assert.equal(text.data.data.message,'Hello');assert.equal(text.data.data.sharedDesign,null);
    // Missing message attachment cannot be read merely by guessing an id.
    assert.equal((await request(seller,'GET',`/conversations/${conversationId}/messages/${text.data.data._id}/design`)).status,404);
  } finally {
    await new Promise(resolve=>server.close(resolve));
    if(previous===undefined) delete process.env.JWT_SECRET;else process.env.JWT_SECRET=previous;
  }
});