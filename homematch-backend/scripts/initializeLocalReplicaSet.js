
const {MongoClient}=require('mongodb');
(async()=>{
 const client=new MongoClient('mongodb://127.0.0.1:27017/?directConnection=true',{serverSelectionTimeoutMS:15000});
 try{
  await client.connect();const admin=client.db('admin');const hello=await admin.command({hello:1});
  if(hello.setName && hello.setName!=='homematch-rs')throw new Error('Another replica set is configured.');
  if(!hello.setName){try{await admin.command({replSetInitiate:{_id:'homematch-rs',members:[{_id:0,host:'localhost:27017'}]}});}catch(e){if(e.codeName!=='AlreadyInitialized')throw e;}}
  const deadline=Date.now()+60000;
  while(Date.now()<deadline){const state=await admin.command({hello:1});if(state.setName==='homematch-rs'&&state.isWritablePrimary){console.log('READY: homematch-rs writable primary');return;}await new Promise(resolve=>setTimeout(resolve,1000));}
  throw new Error('Replica set did not become primary within 60 seconds.');
 }finally{await client.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
