const express=require('express');
const multer=require('multer');
const mongoose=require('mongoose');
const {protect,allowRoles}=require('../middleware/authMiddleware');
const payment=require('../controllers/subscriptionPaymentController');
const subscription=require('../controllers/subscriptionController');
const router=express.Router();
const adminRouter=express.Router();
const validId=(req,res,next)=> mongoose.isObjectIdOrHexString(req.params.id) ? next() : res.status(400).json({message:"ID ไม่ถูกต้อง"});
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:5*1024*1024,files:1,fields:1}});
router.use(protect,allowRoles('seller','admin'));
router.post('/',allowRoles('seller'),upload.single('slip'),(req,res,next)=>{
  if(!mongoose.isObjectIdOrHexString(req.body.paymentId)) return res.status(400).json({message:"paymentId ไม่ถูกต้อง"});
  return payment.submit(req,res,next);
});
router.get('/:id/slip',validId,payment.slip);
router.get('/:id',validId,payment.getPayment);
adminRouter.use(protect,allowRoles('admin'));
adminRouter.get('/payments',payment.list);
adminRouter.patch('/payments/:id/approve',validId,payment.approve);
adminRouter.patch('/payments/:id/reject',validId,payment.reject);
adminRouter.get('/members',subscription.members);
adminRouter.get('/revenue',payment.revenue);
adminRouter.get('/plans',subscription.adminPlans);
adminRouter.patch('/plans/:id',validId,subscription.updatePlan);
adminRouter.get('/payment-settings',payment.getSettings);
adminRouter.put('/payment-settings',express.json({limit:'1mb'}),payment.updateSettings);
module.exports={router,adminRouter};

