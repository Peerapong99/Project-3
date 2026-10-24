const {test}=require('node:test');
const assert=require('node:assert/strict');
const express=require('express'),mongoose=require('mongoose'),jwt=require('jsonwebtoken'),bcrypt=require('bcryptjs');
const {MongoMemoryServer}=require('mongodb-memory-server');
const {OAuth2Client}=require('google-auth-library');
const User=require('../src/models/User');

test('admin moderation blocks every login and existing sessions, protects admins and restores new sessions',{timeout:180000},async t=>{
  const previous=process.env.JWT_SECRET;process.env.JWT_SECRET='moderation-test-only';
  const previousGoogle=process.env.GOOGLE_CLIENT_IDS;process.env.GOOGLE_CLIENT_IDS='test-google-client';
  const db=await MongoMemoryServer.create();let server;
  try {
    await mongoose.connect(db.getUri('moderation_tests'));await User.init();
    const users={},tokens={};
    for(const role of ['admin','buyer','seller']) {
      users[role]=await User.create({name:role,email:`${role}@test.invalid`,phone:'000',role,password:await bcrypt.hash('test-password',4),...(role==='buyer' ? {googleId:'test-google-sub'} : {})});
      tokens[role]=jwt.sign({id:String(users[role]._id)},process.env.JWT_SECRET);
    }
    t.mock.method(OAuth2Client.prototype,'verifyIdToken',async()=>({getPayload:()=>({sub:'test-google-sub',email:'buyer@test.invalid',email_verified:true})}));
    const app=express();app.use(express.json());app.use('/api/admin',require('../src/routes/adminRoutes'));app.use('/api/auth',require('../src/routes/authRoutes'));app.use((e,req,res,next)=>res.status(e.status || 500).json({message:e.message}));
    server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
    async function req(path,{method='GET',role='admin',body,token}={}) {
      const headers={'Content-Type':'application/json'};if(token || role)headers.Authorization='Bearer '+(token || tokens[role]);
      const response=await fetch(`http://127.0.0.1:${server.address().port}/api${path}`,{method,headers,body:body===undefined ? undefined : JSON.stringify(body)});
      return {status:response.status,data:await response.json()};
    }
    const endpoint=role=>`/admin/users/${users[role]._id}/ban`;
    assert.equal((await req('/admin/users',{role:null})).status,401);
    assert.equal((await req(endpoint('seller'),{method:'PATCH',role:'buyer',body:{isBanned:true,reason:'test'}})).status,403);
    assert.equal((await req(endpoint('admin'),{method:'PATCH',body:{isBanned:true,reason:'test'}})).status,403);
    assert.equal((await req(endpoint('buyer'),{method:'PATCH',body:{isBanned:true,reason:' '}})).status,400);
    assert.equal((await req(endpoint('buyer'),{method:'PATCH',body:{isBanned:'true',reason:'test'}})).status,400);
    const listed=await req('/admin/users');assert.equal(listed.status,200);
    assert.ok(listed.data.users.every(user=>user.password===undefined && user.googleId===undefined && user.tokenVersion===undefined));
    for(const role of ['buyer','seller']) {
      const banned=await req(endpoint(role),{method:'PATCH',body:{isBanned:true,reason:'ทดสอบการระงับบัญชี'}});assert.equal(banned.status,200);
      assert.equal(banned.data.user.isBanned,true);assert.equal(String(banned.data.user.bannedBy),String(users.admin._id));
      assert.equal((await req(endpoint(role),{method:'PATCH',body:{isBanned:true,reason:'test'}})).status,409);
      assert.equal((await req('/auth/me',{role})).data.code,'ACCOUNT_BANNED');
      const loginPath=role==='buyer' ? '/auth/buyer/login' : '/auth/login';
      const bannedLogin=await req(loginPath,{method:'POST',role:null,body:{email:`${role}@test.invalid`,password:'test-password'}});
      assert.equal(bannedLogin.status,403);assert.equal(bannedLogin.data.code,'ACCOUNT_BANNED');
      if(role==='buyer') {
        const google=await req('/auth/buyer/google',{method:'POST',role:null,body:{idToken:'test-token'}});
        assert.equal(google.status,403,JSON.stringify(google.data));
      }
      const unbanned=await req(endpoint(role),{method:'PATCH',body:{isBanned:false}});assert.equal(unbanned.status,200);assert.equal(unbanned.data.user.banReason,'');
      assert.equal((await req('/auth/me',{role})).data.code,'SESSION_REVOKED');
      const login=await req(loginPath,{method:'POST',role:null,body:{email:`${role}@test.invalid`,password:'test-password'}});assert.equal(login.status,200);
      assert.equal(jwt.decode(login.data.token).tokenVersion,2);
      assert.equal((await req('/auth/me',{token:login.data.token,role:null})).status,200);
    }
    assert.equal((await User.findById(users.admin._id)).isBanned,false);
  } finally {
    if(server)await new Promise(resolve=>server.close(resolve));await mongoose.disconnect();await db.stop();
    if(previous===undefined)delete process.env.JWT_SECRET;else process.env.JWT_SECRET=previous;
    if(previousGoogle===undefined)delete process.env.GOOGLE_CLIENT_IDS;else process.env.GOOGLE_CLIENT_IDS=previousGoogle;
  }
});