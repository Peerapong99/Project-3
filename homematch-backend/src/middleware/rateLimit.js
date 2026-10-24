const {createHash} = require('crypto');
// Per-process limiter. Deployments with multiple API workers must also enforce a shared edge limit.
function rateLimit({limit=30,windowMs=15*60*1000,key=req=>req.ip,maxKeys=10000}={}) {
  const entries=new Map(); let sweepAt=0;
  return (req,res,next)=>{
    const now=Date.now();
    if(now>=sweepAt) {for(const [id,bucket] of entries) if(bucket.reset<=now) entries.delete(id);sweepAt=now+60000;}
    const id=createHash('sha256').update(String(key(req))).digest('hex');
    let bucket=entries.get(id);
    if(!bucket || bucket.reset<=now) {
      if(!bucket && entries.size>=maxKeys) return res.set('Retry-After','60').status(429).json({code:'RATE_LIMITED',message:'ทำรายการบ่อยเกินไป กรุณาลองใหม่ภายหลัง'});
      bucket={count:0,reset:now+windowMs}; entries.set(id,bucket);
    }
    bucket.count++;
    if(bucket.count>limit) return res.set('Retry-After',String(Math.max(1,Math.ceil((bucket.reset-now)/1000)))).status(429).json({code:'RATE_LIMITED',message:'ทำรายการบ่อยเกินไป กรุณาลองใหม่ภายหลัง'});
    next();
  };
}
module.exports=rateLimit;
