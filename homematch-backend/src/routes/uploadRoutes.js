const router = require('express').Router();
const fs = require('fs/promises');
const validateImages=require('../middleware/validateUploadedImages');
const rateLimit=require('../middleware/rateLimit');
const uploadLimit=rateLimit({limit:60,key:req=>String(req.user._id)});
const upload = require('../middleware/uploadMiddleware');
const {uploadImages, uploadProfileImage} = require('../controllers/uploadController');
const {protect,allowRoles} = require('../middleware/authMiddleware');
const membership = require('../services/subscriptionService');
const loadEntitlement = async (req,res,next) => {
  try {
    const state=await membership.ensureSubscription(req.user._id);
    req.subscriptionPlan=await membership.effectivePlan(state);
    next();
  } catch(e) {next(e);}
};
const uploadForPlan = (req,res,next) => {
  upload.fields([{name:'images',maxCount:req.subscriptionPlan.imageLimit},{name:'floorPlans',maxCount:5}])(req,res,next);
};
const registerUploads = async (req,res,next) => {
  const files=Object.values(req.files || {}).flat();
  try {
    await require('../models/MediaUpload').init();
    if(files.length) await membership.sellerTransaction(req.user._id,async ({session})=>{
      await require('../models/MediaUpload').create(files.map(file=>({owner:req.user._id,url:'/uploads/'+(file.fieldname==='floorPlans'?'floorplans':'properties')+'/'+file.filename,mimeType:file.mimetype,bytes:file.size})),{session});
    });
    next();
  } catch(error) {
    await Promise.all(files.map(file=>fs.unlink(file.path).catch(()=>{})));
    next(error);
  }
};
const recheckUploads = async (req,res,next) => {
  try {
    const state=await membership.ensureSubscription(req.user._id);
    const plan=await membership.effectivePlan(state);
    if((req.files?.images || []).length>plan.imageLimit) {
      await Promise.all(Object.values(req.files || {}).flat().map(f=>fs.unlink(f.path).catch(()=>{})));
      return res.status(403).json({code:'IMAGE_LIMIT_REACHED',message:"จำนวนรูปเกินสิทธิ์แพ็กเกจปัจจุบัน"});
    }
    next();
  } catch(e) {next(e);}
};
router.post('/', protect, allowRoles('seller'), uploadLimit, loadEntitlement, uploadForPlan, validateImages, recheckUploads, registerUploads, uploadImages);
router.post('/profile', protect, allowRoles('buyer','seller'), uploadLimit, upload.single('profileImage'), validateImages, uploadProfileImage);
module.exports=router;
