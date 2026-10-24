const MediaUpload=require('../models/MediaUpload');
const {fail,mediaImages}=require('./subscriptionService');
const paths=data=>[...mediaImages(data),...(data.floorPlans || []).map(plan=>plan.imageUrl)];
async function assertMediaOwnership(data,owner,previous,session) {
  const prior=new Set(previous?paths(previous):[]);
  const added=[...new Set(paths(data).filter(url=>!prior.has(url)))];
  if(!added.length)return;
  const owned=await MediaUpload.find({owner,url:{$in:added}}).session(session).select('url').lean();
  if(owned.length!==added.length)fail(400,'INVALID_MEDIA_OWNER','กรุณาใช้รูปภาพที่อัปโหลดด้วยบัญชีของคุณ');
}
module.exports={assertMediaOwnership};
