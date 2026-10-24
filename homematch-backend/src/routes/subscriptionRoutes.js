const router = require('express').Router();
const {protect,allowRoles} = require('../middleware/authMiddleware');
const controller = require('../controllers/subscriptionController');
const payment = require('../controllers/subscriptionPaymentController');
router.get('/plans',controller.plans);
router.use(protect,allowRoles('seller'));
router.get('/me',controller.me);
router.get('/usage',controller.usage);
router.get('/analytics',controller.analytics);
router.get('/history',controller.history);
router.post('/subscribe',payment.subscribe);
module.exports=router;

