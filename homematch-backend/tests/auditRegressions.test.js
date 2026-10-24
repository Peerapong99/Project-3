const {test}=require('node:test');
const assert=require('node:assert/strict');
const express=require('express'),mongoose=require('mongoose'),jwt=require('jsonwebtoken'),crypto=require('crypto');
const {MongoMemoryReplSet}=require('mongodb-memory-server');
const User=require('../src/models/User'),Property=require('../src/models/Property'),Offer=require('../src/models/PurchaseOffer'),Appointment=require('../src/models/Appointment'),Notification=require('../src/models/Notification'),Design=require('../src/models/RoomDesign');
const membership=require('../src/services/subscriptionService');

test('audit regressions: isolated replica set, authorization and concurrent mutations',{timeout:180000},async t=>{
 const previous=process.env.JWT_SECRET;process.env.JWT_SECRET='audit-regressions-only';
 const replica=await MongoMemoryReplSet.create({replSet:{count:1}});let server;const uploadedPaths=[];
 try {
  await mongoose.connect(replica.getUri('audit_regressions'));await membership.seedPlans();
  await Promise.all([User,Property,Offer,Appointment,Notification,Design].map(m=>m.init()));
  const users={},tokens={};
  for(const role of ['seller','buyer','other']) {
   users[role]=await User.create({name:role,email:role+'@test.invalid',phone:'000',password:'test-only',role:role==='seller'?'seller':'buyer'});
   tokens[role]=jwt.sign({id:String(users[role]._id),tokenVersion:0},process.env.JWT_SECRET);
  }
  async function house(title) {return Property.create({seller:users.seller._id,title,description:'Test',type:'house',price:1000000,area:100,location:{address:'Test',district:'Test',province:'Test'},status:'approved',floorPlans:[{floor:1,imageUrl:'/uploads/floorplans/123-1.png',rooms:[{name:'Bedroom',x:50,y:50}]}]});}
  const home=await house('Home'),second=await house('Second');
  const app=express();app.use(express.json());
  for(const [prefix,module] of [['uploads','uploadRoutes'],['auth','authRoutes'],['offers','offerRoutes'],['appointments','appointmentRoutes'],['properties','propertyRoutes'],['room-designs','roomDesignRoutes']]) app.use('/api/'+prefix,require('../src/routes/'+module));
  app.use((error,req,res,next)=>res.status(error.status || 500).json({message:error.message,code:error.code}));
  server=await new Promise(resolve=>{const instance=app.listen(0,'127.0.0.1',()=>resolve(instance));});
  async function request(path,{method='GET',role='buyer',body}={}) {
   const headers={'Content-Type':'application/json'};if(role)headers.Authorization='Bearer '+tokens[role];
   if(body instanceof FormData)delete headers['Content-Type'];
   const response=await fetch('http://127.0.0.1:'+server.address().port+'/api'+path,{method,headers,body:body instanceof FormData?body:body===undefined?undefined:JSON.stringify(body)});
   return {status:response.status,data:await response.json()};
  }
  await t.test('reset revokes old JWT, consumes token once and permits fresh login',async()=>{
   const raw=crypto.randomBytes(32).toString('hex');
   await User.updateOne({_id:users.other._id},{$set:{resetPasswordToken:crypto.createHash('sha256').update(raw).digest('hex'),resetPasswordExpires:new Date(Date.now()+60000)}});
   const reset=await request('/auth/reset-password',{method:'POST',role:null,body:{token:raw,password:'new-password-123'}});assert.equal(reset.status,200,JSON.stringify(reset.data));
   assert.equal((await request('/auth/me',{role:'other'})).status,401);
   assert.equal((await request('/offers/my',{role:'other'})).status,401);
   assert.equal((await request('/auth/reset-password',{method:'POST',role:null,body:{token:raw,password:'new-password-123'}})).status,400);
   const login=await request('/auth/buyer/login',{method:'POST',role:null,body:{email:'other@test.invalid',password:'new-password-123'}});assert.equal(login.status,200);
   tokens.other=login.data.token;assert.equal((await request('/auth/me',{role:'other'})).status,200);
  });
  await t.test('two offers can be created but only one accepted under concurrency',async()=>{
   const created=await Promise.all(['buyer','other'].map(role=>request('/offers',{method:'POST',role,body:{propertyId:String(home._id),offerPrice:1000000}})));
   assert.deepEqual(created.map(r=>r.status),[201,201]);
   const accepted=await Promise.all(created.map(r=>request('/offers/'+r.data.offer._id+'/respond',{method:'PATCH',role:'seller',body:{status:'accepted'}})));
   assert.deepEqual(accepted.map(r=>r.status).sort(),[200,409]);
   assert.equal(await Offer.countDocuments({property:home._id,status:'accepted'}),1);
   assert.equal((await request('/offers',{method:'POST',body:{propertyId:String(home._id),offerPrice:0.5}})).status,400);
  });
  const date=new Date(Date.now()+3*86400000).toISOString().slice(0,10);let appointmentId;
  await t.test('seller cannot be booked twice even for different homes',async()=>{
   const results=await Promise.all([home,second].map((p,index)=>request('/appointments',{method:'POST',role:index?'other':'buyer',body:{propertyId:String(p._id),appointmentDate:date,appointmentTime:'10:00'}})));
   assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);
   appointmentId=results.find(r=>r.status===201).data.appointment._id;
   assert.equal(await Appointment.countDocuments({seller:users.seller._id,status:'pending'}),1);
   assert.equal((await request('/appointments',{method:'POST',body:{propertyId:String(home._id),appointmentDate:'2026-02-30',appointmentTime:'10:00'}})).status,400);
  });
  await t.test('confirm/cancel cannot overwrite a cancelled appointment',async()=>{
   const appointment=await Appointment.findById(appointmentId);const owner=String(appointment.buyer)===String(users.buyer._id)?'buyer':'other';
   const results=await Promise.all([request('/appointments/'+appointmentId+'/status',{method:'PATCH',role:'seller',body:{status:'confirmed'}}),request('/appointments/'+appointmentId+'/cancel',{method:'PATCH',role:owner,body:{}})]);
   assert.equal(results[1].status,200);assert.ok([200,409].includes(results[0].status));
   assert.equal((await Appointment.findById(appointmentId)).status,'cancelled');
  });
  await t.test('notification failure rolls back appointment creation',async()=>{
   const before=await Appointment.countDocuments();const mock=t.mock.method(Notification,'create',async()=>{throw new Error('simulated notification failure');});
   try {assert.equal((await request('/appointments',{method:'POST',body:{propertyId:String(home._id),appointmentDate:date,appointmentTime:'11:00'}})).status,500);assert.equal(await Appointment.countDocuments(),before);} finally {mock.mock.restore();}
  });
  const layout={propertyId:String(home._id),floor:'1',roomId:String(home.floorPlans[0].rooms[0]._id),room:'Bedroom',roomSize:{width:5,height:6,unit:'meter'},canvasSize:{width:300,height:360},furniture:[{id:'bed-1',type:'bed',x:10,y:20,width:40,height:50,realWidth:1,realHeight:2,rotation:0}]};let design;
  await t.test('invalid design payloads never persist; nonexistent rooms are rejected',async()=>{
   for(const furniture of [[null],[{...layout.furniture[0],x:-1}],[layout.furniture[0],layout.furniture[0]],[{...layout.furniture[0],width:'10'}]]) assert.equal((await request('/room-designs',{method:'PUT',body:{...layout,furniture}})).status,400);
   assert.equal(await Design.countDocuments(),0);
   assert.equal((await request('/room-designs',{method:'PUT',body:{...layout,roomId:'missing'}})).status,400);
   const result=await request('/room-designs',{method:'PUT',body:layout});assert.equal(result.status,200,JSON.stringify(result.data));design=result.data.design;
  });
  await t.test('concurrent layout saves allow exactly one winner and reject stale/missing versions',async()=>{
   assert.equal((await request('/room-designs',{method:'PUT',body:layout})).status,409);
   const results=await Promise.all([30,50].map(x=>request('/room-designs',{method:'PUT',body:{...layout,expectedUpdatedAt:design.updatedAt,furniture:[{...layout.furniture[0],x}]}})));
   assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
   design=results.find(r=>r.status===200).data.design;
  });
  await t.test('soft delete preserves history, hides listing, cancels active work, and owner can delete orphan design by ID',async()=>{
   const pending=await request('/offers',{method:'POST',role:'buyer',body:{propertyId:String(second._id),offerPrice:900000}});assert.equal(pending.status,201);
   assert.equal((await request('/properties/'+second._id,{method:'DELETE',role:'seller'})).status,200);
   assert.equal(await Property.findById(second._id),null);
   assert.ok((await Property.collection.findOne({_id:second._id})).deletedAt);
   assert.equal((await Offer.findById(pending.data.offer._id)).status,'cancelled');
   assert.equal((await request('/properties/'+home._id,{method:'DELETE',role:'seller'})).status,200);
   assert.equal((await request('/room-designs/'+design._id,{method:'DELETE',role:'other'})).status,404);
   assert.equal((await request('/room-designs/'+design._id,{method:'DELETE'})).status,200);
  });
  await t.test('upload checks actual file signature and property media ownership',async()=>{
   const Media=require('../src/models/MediaUpload');await Media.init();
   const invalid=new FormData();invalid.append('images',new Blob(['not a PNG'],{type:'image/png'}),'invalid.png');
   assert.equal((await request('/uploads',{method:'POST',role:'seller',body:invalid})).status,400);
   assert.equal(await Media.countDocuments(),0);
   const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=','base64');
   const valid=new FormData();valid.append('images',new Blob([png],{type:'image/png'}),'valid.png');
   const uploaded=await request('/uploads',{method:'POST',role:'seller',body:valid});assert.equal(uploaded.status,201,JSON.stringify(uploaded.data));
   uploadedPaths.push(...uploaded.data.images);
   const url=uploaded.data.images[0];
   await require('../src/services/mediaUploadService').assertMediaOwnership({images:[url]},users.seller._id,null,null);
   await assert.rejects(require('../src/services/mediaUploadService').assertMediaOwnership({images:[url]},users.buyer._id,null,null),error=>error.code==='INVALID_MEDIA_OWNER');
   const payload={title:'Uploaded house',description:'Test',type:'house',price:1,area:1,location:{address:'a',district:'b',province:'c'},images:[url]};
   assert.equal((await request('/properties',{method:'POST',role:'seller',body:payload})).status,201);
   assert.equal((await request('/properties',{method:'POST',role:'seller',body:{...payload,images:['/uploads/properties/123-999.png']}})).status,400);
  });
 } finally {
  if(server)await new Promise(resolve=>server.close(resolve));
  const path=require('path'),fs=require('fs/promises');
  for(const url of uploadedPaths) {if(/^\/uploads\/properties\/[0-9]+-[0-9]+\.png$/.test(url)) await fs.unlink(path.join(__dirname,'..',url)).catch(()=>{});}await mongoose.disconnect();await replica.stop();
  if(previous===undefined)delete process.env.JWT_SECRET;else process.env.JWT_SECRET=previous;
 }
});

test('slot validation uses Thailand time and rejects elapsed same-day time',()=>{
 const {parseSlot}=require('../src/controllers/appointmentController');
 assert.throws(()=>parseSlot('2026-10-16','09:59',new Date('2026-10-16T03:00:00Z')),error=>error.code==='PAST_SLOT');
 assert.equal(parseSlot('2026-10-16','10:01',new Date('2026-10-16T03:00:00Z')).toISOString(),'2026-10-16T00:00:00.000Z');
});

test('rate limit bounds attempts, supplies retry delay and isolates account keys',()=>{
 const limiter=require('../src/middleware/rateLimit')({limit:2,key:req=>req.key});let next=0,status,headers={};
 const response={set:(k,v)=>{headers[k]=v;return response;},status:value=>{status=value;return response;},json:()=>response};
 for(let i=0;i<3;i++)limiter({key:'one'},response,()=>next++);
 assert.equal(next,2);assert.equal(status,429);assert.ok(Number(headers['Retry-After'])>0);
 limiter({key:'two'},response,()=>next++);assert.equal(next,3);
});
