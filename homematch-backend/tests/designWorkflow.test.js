const {test}=require('node:test');
const assert=require('node:assert/strict');
const express=require('express');
const mongoose=require('mongoose');
const jwt=require('jsonwebtoken');
const {MongoMemoryServer}=require('mongodb-memory-server');
const User=require('../src/models/User'),Property=require('../src/models/Property'),RoomDesign=require('../src/models/RoomDesign'),Catalog=require('../src/models/DesignCatalogItem'),Conversation=require('../src/models/Conversation'),Message=require('../src/models/Message'),Notification=require('../src/models/Notification');

test('complete design workflow with real isolated MongoDB and HTTP/JWT',{timeout:180000},async t=>{
  const previous=process.env.JWT_SECRET;process.env.JWT_SECRET='isolated-design-workflow-tests';
  const database=await MongoMemoryServer.create();
  let server;
  try {
    await mongoose.connect(database.getUri('design_workflow_tests'));
    await Promise.all([User,Property,RoomDesign,Catalog,Conversation,Message,Notification].map(model=>model.init()));
    const accounts={},tokens={};
    for(const role of ['buyer','seller','admin','other']) {
      accounts[role]=await User.create({name:role,email:`${role}@test.invalid`,phone:'000',password:'test-only',role:role==='other' ? 'buyer' : role});
      tokens[role]=jwt.sign({id:String(accounts[role]._id)},process.env.JWT_SECRET);
    }
    const property=await Property.create({seller:accounts.seller._id,title:'บ้านทดสอบภาษาไทย',description:'Isolated test',type:'house',price:1000000,area:100,location:{address:'Test',district:'Test',province:'Test'},status:'approved',floorPlans:[{floor:1,imageUrl:'/uploads/floorplans/123-1.png',rooms:[{name:'Bedroom',x:50,y:50}]}]});
    const app=express();app.use(express.json());app.use('/api/room-designs',require('../src/routes/roomDesignRoutes'));app.use('/api/chat',require('../src/routes/chatRoutes'));app.use((e,req,res,next)=>res.status(e.status || 500).json({message:e.message}));
    server=await new Promise(resolve=>{const instance=app.listen(0,'127.0.0.1',()=>resolve(instance));});
    const base=`http://127.0.0.1:${server.address().port}/api`;
    async function request(path,{method='GET',role='buyer',body}={}) {
      const headers={'Content-Type':'application/json'};if(role)headers.Authorization='Bearer '+tokens[role];
      const response=await fetch(base+path,{method,headers,body:body===undefined ? undefined : JSON.stringify(body)});
      return {status:response.status,data:await response.json()};
    }
    const layout={propertyId:String(property._id),room:'ห้องนอน',roomId:String(property.floorPlans[0].rooms[0]._id),floor:'1',canvasSize:{width:300,height:360},roomSize:{width:5,height:6,unit:'meter'},selectedFloor:{id:'tile',name:'กระเบื้อง'},selectedWall:{id:'white',name:'ขาว',color:'#FFFFFF'},furniture:[{id:'bed-1',type:'bed',name:'เตียง',x:20,y:30,width:70,height:90,realWidth:1.8,realHeight:2,rotation:90},{id:'bed-2',type:'bed',name:'เตียง',x:110,y:130,width:70,height:90,realWidth:1.8,realHeight:2,rotation:180}]};
    let designId,summaryPath,conversationId,sharedPath;
    await t.test('save/load retains instance positions, dimensions, floor and wall',async()=>{
      const saved=await request('/room-designs',{method:'PUT',body:layout});assert.equal(saved.status,200,JSON.stringify(saved.data));designId=saved.data.design._id;summaryPath=`/room-designs/${designId}/price-summary`;
      const loaded=await request('/room-designs?'+new URLSearchParams({propertyId:layout.propertyId,roomId:layout.roomId,floor:layout.floor}));
      assert.deepEqual(loaded.data.design.furniture,layout.furniture);assert.deepEqual(loaded.data.design.canvasSize,layout.canvasSize);assert.equal(loaded.data.design.selectedFloor.id,'tile');assert.equal(loaded.data.design.selectedWall.color,'#FFFFFF');
      assert.equal((await request(summaryPath,{role:'other'})).status,404);assert.equal((await request(summaryPath,{role:null})).status,401);
    });
    await t.test('reference prices, real quantities, budget and snapshot persist',async()=>{
      assert.equal((await request('/room-designs/catalog/furniture/bed',{method:'PUT',role:'buyer',body:{unitPrice:100.25,priceSource:'verified test'}})).status,403);
      assert.equal((await request('/room-designs/catalog/furniture/bed',{method:'PUT',role:'admin',body:{unitPrice:100.25,priceSource:'verified test'}})).status,200);
      const live=await request(summaryPath);assert.equal(live.data.summary.grandTotal,200.5);assert.equal(live.data.summary.materialItems[0].quantity,null);
      const saved=await request(summaryPath,{method:'PATCH',body:{designName:'แบบทดสอบ',budget:300,expectedUpdatedAt:live.data.design.updatedAt,estimatedTotal:999999,priceSnapshot:{grandTotal:999999}}});assert.equal(saved.status,200,JSON.stringify(saved.data));
      assert.equal(saved.data.design.estimatedTotal,200.5);assert.equal(saved.data.design.budget,300);
      assert.equal((await request(summaryPath,{method:'PATCH',body:{designName:'stale',budget:300,expectedUpdatedAt:live.data.design.updatedAt}})).status,409);
      await request('/room-designs/catalog/furniture/bed',{method:'PUT',role:'admin',body:{unitPrice:150,priceSource:'updated test'}});
      const reopened=await request(summaryPath);assert.equal(reopened.data.summary.grandTotal,200.5);assert.equal(reopened.data.currentSummary.grandTotal,300);assert.equal(reopened.data.summarySource,'saved');
      const mine=await request('/room-designs/my-designs');assert.equal(mine.data.designs[0].designName,'แบบทดสอบ');assert.equal(mine.data.designs[0].budget,300);
    });
    await t.test('share into existing chat and seller can view only the immutable shared copy',async()=>{
      const opened=await request('/chat/conversations',{method:'POST',body:{propertyId:layout.propertyId}});assert.equal(opened.status,200);conversationId=opened.data.conversation._id;
      const state=await request(summaryPath);
      const sent=await request(`/chat/conversations/${conversationId}/messages`,{method:'POST',body:{message:'Share',designId,expectedUpdatedAt:state.data.design.updatedAt,pricingMode:'saved'}});assert.equal(sent.status,201,JSON.stringify(sent.data));
      sharedPath=`/chat/conversations/${conversationId}/messages/${sent.data.data._id}/design`;
      assert.equal(sent.data.data.sharedDesign.summary.grandTotal,200.5);
      assert.equal((await request(sharedPath,{role:'seller'})).status,200);assert.equal((await request(sharedPath,{role:'other'})).status,404);
      assert.equal((await request(summaryPath,{role:'seller'})).status,404);
      const messages=await request(`/chat/conversations/${conversationId}/messages`,{role:'seller'});assert.equal(messages.status,200);assert.ok(messages.data.messages[0].sharedDesign);
      assert.equal(await Notification.countDocuments({user:accounts.seller._id,type:'new_message'}),1);
    });
    await t.test('editing original retains budget/name and leaves shared snapshot intact; PDF uses latest state',async()=>{
      layout.expectedUpdatedAt=(await request(summaryPath)).data.design.updatedAt;
      layout.furniture[0].x=70;layout.furniture[0].rotation=270;
      const edited=await request('/room-designs',{method:'PUT',body:layout});assert.equal(edited.status,200);assert.equal(edited.data.design.priceSnapshot,null);assert.equal(edited.data.design.budget,300);assert.equal(edited.data.design.designName,'แบบทดสอบ');
      assert.equal(await RoomDesign.countDocuments({userId:accounts.buyer._id}),1);
      const shared=await request(sharedPath,{role:'seller'});assert.equal(shared.data.design.furniture[0].x,20);assert.equal(shared.data.summary.grandTotal,200.5);
      const current=await request(summaryPath);assert.equal(current.data.summary.grandTotal,300);
      const {buildDesignPdfHtml}=require('../../HomeMatchMobile/src/utils/designPdfHtml');
      const html=buildDesignPdfHtml({design:current.data.design,summary:current.data.summary,designName:current.data.design.designName,budget:current.data.design.budget,source:current.data.summarySource});
      assert.ok(html.includes('แบบทดสอบ'));assert.ok(html.includes('บ้านทดสอบภาษาไทย'));assert.ok(html.includes('rotate(270deg)'));
      const text=await request(`/chat/conversations/${conversationId}/messages`,{method:'POST',role:'seller',body:{message:'รับแบบแล้ว'}});assert.equal(text.status,201);assert.equal(text.data.data.sharedDesign,null);
    });
  } finally {
    if(server) await new Promise(resolve=>server.close(resolve));
    await mongoose.disconnect();await database.stop();
    if(previous===undefined)delete process.env.JWT_SECRET;else process.env.JWT_SECRET=previous;
  }
});