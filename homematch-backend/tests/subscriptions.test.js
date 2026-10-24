
const {test} = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const fs = require('fs/promises');
const path = require('path');
const {MongoMemoryReplSet} = require('mongodb-memory-server');
const User = require('../src/models/User');
const Property = require('../src/models/Property');
const Plan = require('../src/models/SubscriptionPlan');
const Subscription = require('../src/models/SellerSubscription');
const Payment = require('../src/models/SubscriptionPayment');
const service = require('../src/services/subscriptionService');
const {imageType} = require('../src/controllers/subscriptionPaymentController');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=','base64');
const propertyData = (images=[]) => ({title:'Test house',description:'Integration test',type:'house',price:1000000,area:50,location:{address:'1',district:'Test',province:'Bangkok'},images});
test('membership API and transactions on isolated replica set', {timeout:240000}, async t => {
  process.env.JWT_SECRET='subscription-test-secret-only';
  const replica = await MongoMemoryReplSet.create({replSet:{count:1,storageEngine:'wiredTiger'}});
  let server;
  const files=[];
  try {
    await mongoose.connect(replica.getUri('membership_tests'));
    await service.seedPlans();
    await Promise.all([User.init(),Property.init(),Plan.init(),Subscription.init(),Payment.init()]);
    const app=express();app.use(express.json({limit:'1mb'}));
    const payments=require('../src/routes/subscriptionPaymentRoutes');
    app.use('/api/subscriptions/payments',payments.router);
    app.use('/api/subscriptions',require('../src/routes/subscriptionRoutes'));
    app.use('/api/admin/subscriptions',payments.adminRouter);
    app.use('/api/properties',require('../src/routes/propertyRoutes'));
    app.use('/api/uploads',require('../src/routes/uploadRoutes'));
    app.use((e,req,res,next)=>res.status(e.status || 400).json({message:e.message,code:e.code}));
    server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
    const base='http://127.0.0.1:'+server.address().port+'/api';
    const users={}; const tokens={};
    for(const role of ['seller','admin','buyer']) {
      users[role]=await User.create({name:role,email:role+'@test.invalid',phone:'000',password:'test-only',role});
      tokens[role]=jwt.sign({id:users[role]._id.toString(),role},process.env.JWT_SECRET);
    }
    const other=await User.create({name:'other',email:'other@test.invalid',phone:'000',password:'test-only',role:'seller'});
    tokens.other=jwt.sign({id:other._id.toString(),role:'seller'},process.env.JWT_SECRET);
    async function registerFixtureMedia(body, owner) {
      const urls=[...(body.images || []),...(body.floorPlans || []).flatMap(plan=>[plan.imageUrl,...(plan.rooms || []).flatMap(room=>room.images || [])])];
      for(const url of new Set(urls))await require('../src/models/MediaUpload').updateOne({url},{$setOnInsert:{owner,url,mimeType:'image/jpeg',bytes:1}},{upsert:true});
    }
    async function request(endpoint,{method='GET',role='seller',body,key}={}) {
      if(endpoint==='/properties' && method==='POST' && role==='seller' && body) await registerFixtureMedia(body,users.seller._id);
      const headers={};if(role)headers.Authorization='Bearer '+tokens[role];
      if(key)headers['Idempotency-Key']=key;
      if(body && !(body instanceof FormData))headers['Content-Type']='application/json';
      const response=await fetch(base+endpoint,{method,headers,body:body instanceof FormData?body:body===undefined?undefined:JSON.stringify(body)});
      const data=await response.json();return {status:response.status,data};
    }
    async function order(code,key) {return request('/subscriptions/subscribe',{method:'POST',body:{planCode:code},key});}
    async function submit(id) {
      const form=new FormData();form.append('paymentId',id);form.append('slip',new Blob([png],{type:'image/png'}),'slip.png');
      const result=await request('/subscriptions/payments',{method:'POST',body:form});
      const payment=await Payment.findById(id);if(payment.slip?.filename) files.push(payment.slip.filename);
      return result;
    }
    await t.test('default Free, RBAC and unconfigured real payment',async()=>{
      assert.equal((await request('/subscriptions/me')).data.plan.code,'free');
      assert.equal((await request('/subscriptions/me',{role:'buyer'})).status,403);
      assert.equal((await request('/subscriptions/me',{role:null})).status,401);
      assert.equal((await order('premium','unconfigured_1')).status,503);
      assert.equal((await request('/admin/subscriptions/payment-settings',{method:'PUT',role:'admin',body:{enabled:true,mode:'manual'}})).status,400);
      assert.equal((await request('/admin/subscriptions/payment-settings',{method:'PUT',role:'admin',body:{enabled:true,mode:'simulation'}})).status,200);
    });
    await t.test('parallel creates cannot exceed Free quota; forged fields ignored',async()=>{
      const results=await Promise.all(Array.from({length:8},()=>request('/properties',{method:'POST',body:{...propertyData(),seller:other._id,status:'approved',plan:'pro'}})));
      assert.equal(results.filter(r=>r.status===201).length,3,JSON.stringify(results));
      assert.equal(await Property.countDocuments({seller:users.seller._id,status:'pending'}),3);
      assert.equal(await Property.countDocuments({seller:other._id}),0);
      assert.equal((await request('/subscriptions/usage')).data.remaining,0);
    });
    await t.test('rejection releases quota and rejected resubmission is gated',async()=>{
      const property=await Property.findOne({seller:users.seller._id});
      assert.equal((await request('/properties/admin/'+property._id+'/review',{method:'PATCH',role:'admin',body:{status:'rejected',rejectionReason:'test'}})).status,200);
      assert.equal((await request('/properties',{method:'POST',body:propertyData()})).status,201);
      assert.equal((await request('/properties/'+property._id,{method:'PATCH',body:{title:'resubmit'}})).status,403);
    });
    let paymentId;
    await t.test('server prices, order idempotency, slip privacy and no early entitlement',async()=>{
      assert.equal((await request('/subscriptions/subscribe',{method:'POST',key:'tamper_01',body:{planCode:'premium',priceSatang:1}})).status,400);
      assert.equal((await request('/subscriptions/subscribe',{method:'POST',key:'query_operator_01',body:{planCode:{$ne:'free'}}})).status,400);
      const ordered=await order('premium','premium_order_1');assert.equal(ordered.status,201);
      paymentId=ordered.data.payment._id;assert.equal(ordered.data.payment.amountSatang,29900);
      assert.equal((await order('premium','premium_order_1')).data.payment._id,paymentId);
      assert.equal((await order('pro','premium_order_1')).status,409);
      assert.equal((await submit(paymentId)).status,201);
      assert.equal((await request('/subscriptions/me')).data.plan.code,'free');
      assert.equal((await request('/subscriptions/payments/'+paymentId,{role:'other'})).status,404);
      assert.equal((await request('/admin/subscriptions/payments/'+paymentId+'/approve',{method:'PATCH',body:{}})).status,403);
      const slip=await fetch(base+'/subscriptions/payments/'+paymentId+'/slip',{headers:{Authorization:'Bearer '+tokens.admin}});
      assert.equal(slip.status,200);assert.equal(slip.headers.get('cache-control'),'no-store');
      assert.deepEqual(Buffer.from(await slip.arrayBuffer()),png);
    });
    await t.test('parallel approvals activate once and snapshot survives price edits',async()=>{
      const plan=await Plan.findOne({code:'premium'});
      assert.equal((await request('/admin/subscriptions/plans/'+plan._id,{method:'PATCH',role:'admin',body:{priceSatang:39900,listingLimit:25}})).status,200);
      const results=await Promise.all(Array.from({length:4},()=>request('/admin/subscriptions/payments/'+paymentId+'/approve',{method:'PATCH',role:'admin',body:{}})));
      assert.equal(results.filter(r=>r.status===200).length,1,JSON.stringify(results));
      const state=(await request('/subscriptions/me')).data;
      assert.equal(state.plan.code,'premium');assert.equal(state.plan.listingLimit,20);
      const subscription=await Subscription.findOne({seller:users.seller._id});
      assert.equal(subscription.history.filter(e=>String(e.payment)===paymentId).length,1);
      const revenue=(await request('/admin/subscriptions/revenue',{role:'admin'})).data;
      assert.equal(revenue.manual.totalSatang,0);assert.equal(revenue.simulation.totalSatang,29900);
    });
    await t.test('image quota including room photos; rejected payment grants nothing',async()=>{
      const images=Array.from({length:16},(_,i)=>'/uploads/properties/123-'+i+'.jpg');
      assert.equal((await request('/properties',{method:'POST',body:propertyData(images)})).status,403);
      assert.equal((await request('/properties',{method:'POST',body:propertyData(images.slice(0,15))})).status,201);
      const withRoom={...propertyData(images.slice(0,15)),floorPlans:[{floor:1,imageUrl:'/uploads/floorplans/123-1.png',rooms:[{name:'Room',x:50,y:50,images:['/uploads/properties/123-99.jpg']}]}]};
      assert.equal((await request('/properties',{method:'POST',body:withRoom})).status,403);
      const rejected=await order('pro','reject_order_1');const id=rejected.data.payment._id;await submit(id);
      assert.equal((await request('/admin/subscriptions/payments/'+id+'/reject',{method:'PATCH',role:'admin',body:{reason:'invalid transfer'}})).status,200);
      assert.equal((await request('/admin/subscriptions/payments/'+id+'/approve',{method:'PATCH',role:'admin',body:{}})).status,409);
      assert.equal((await request('/subscriptions/me')).data.plan.code,'premium');
    });
    await t.test('renewal extends once; expiry preserves listings and old images',async()=>{
      const before=(await request('/subscriptions/me')).data;
      const renewal=await order('premium','renew_order_1');await submit(renewal.data.payment._id);
      assert.equal((await request('/admin/subscriptions/payments/'+renewal.data.payment._id+'/approve',{method:'PATCH',role:'admin',body:{}})).status,200);
      const after=(await request('/subscriptions/me')).data;
      assert.equal(new Date(after.endsAt)-new Date(before.endsAt),service.DAY*30);
      const count=await Property.countDocuments({seller:users.seller._id});
      await Subscription.updateOne({seller:users.seller._id},{$set:{'currentMembership.endsAt':new Date(Date.now()-1000)}});
      assert.equal((await request('/subscriptions/me')).data.plan.code,'free');
      assert.equal((await request('/properties',{method:'POST',body:propertyData()})).status,403);
      assert.equal(await Property.countDocuments({seller:users.seller._id}),count);
      const legacy=await Property.findOne({seller:users.seller._id,'images.14':{$exists:true}});
      assert.equal((await request('/properties/'+legacy._id,{method:'PATCH',body:{title:'Keep images'}})).status,200);
      const changed=[...legacy.images];changed[0]='/uploads/properties/123-999.jpg';
      assert.equal((await request('/properties/'+legacy._id,{method:'PATCH',body:{images:changed}})).status,403);
      const history=(await request('/subscriptions/history')).data.history;
      assert.equal(history.filter(e=>e.type==='expired').length,1);
      assert.equal((await request('/subscriptions/history')).data.history.filter(e=>e.type==='expired').length,1);
    });
    await t.test('Pro featured ordering and real view analytics access',async()=>{
      const ordered=await order('pro','pro_order_1');await submit(ordered.data.payment._id);
      assert.equal((await request('/admin/subscriptions/payments/'+ordered.data.payment._id+'/approve',{method:'PATCH',role:'admin',body:{}})).status,200);
      const house=await Property.findOne({seller:users.seller._id,status:'pending'});
      assert.equal((await request('/properties/admin/'+house._id+'/review',{method:'PATCH',role:'admin',body:{status:'approved'}})).status,200);
      assert.equal((await request('/properties/public',{role:null})).data.properties[0].featured,true);
      const detail=await request('/properties/public/'+house._id,{role:null});
      assert.equal(detail.status,200);assert.equal(detail.data.property.viewCount,undefined);assert.equal(detail.data.property.dailyViews,undefined);
      const mine=await request('/properties/my');assert(mine.data.properties.every(p=>p.viewCount===undefined && p.dailyViews===undefined));
      const stats=(await request('/subscriptions/analytics')).data;
      assert.equal(stats.detailed,true);assert.equal(stats.totalViews,1);
      assert.equal((await request('/subscriptions/analytics',{role:'other'})).status,403);
      assert.equal((await order('premium','downgrade_1')).status,409);
      await Subscription.updateOne({seller:users.seller._id},{$set:{'currentMembership.endsAt':new Date(Date.now()-1000)}});
      assert.equal((await request('/properties/public',{role:null})).data.properties[0].featured,false);
    });
    await t.test('slip content validation',async()=>{
      assert.equal(imageType(Buffer.from('<svg/>')),null);
      assert.equal(imageType(png).mimeType,'image/png');
    });
  } finally {
    if(server) await new Promise(resolve=>server.close(resolve));
    for(const file of files) await fs.unlink(path.join(__dirname,'../private/subscription-slips',file)).catch(()=>{});
    await mongoose.disconnect();await replica.stop();
  }
});


test('UTF-8 Thai membership copy is intact',async()=>{
  const backend=await fs.readFile(path.join(__dirname,'../src/controllers/subscriptionPaymentController.js'),'utf8');
  assert(backend.includes('กรุณาอัปโหลดหลักฐาน'));
  const paths=['SubscriptionPlans.jsx','MySubscription.jsx','SubscriptionCheckout.jsx'];
  for(const name of paths){const text=await fs.readFile(path.join(__dirname,'../../homematch-web/src/Components/Seller',name),'utf8');assert(!/\?{3,}/.test(text));}
  const admin=await fs.readFile(path.join(__dirname,'../../homematch-web/src/Components/Admin/SubscriptionManagement.jsx'),'utf8');
  assert(admin.includes('จัดการสมาชิก'));assert(!/\?{3,}/.test(admin));
});
