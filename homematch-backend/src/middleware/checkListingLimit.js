const service = require('../services/subscriptionService');
module.exports = async (req, res, next) => {
  try {
    const subscription = await service.ensureSubscription(req.user._id);
    const plan = await service.effectivePlan(subscription);
    const usage = await service.getUsage(req.user._id, null, plan);
    if (!usage.canCreate) return res.status(403).json({code: 'LISTING_LIMIT_REACHED', message: "ใช้โควตาประกาศครบแล้ว กรุณาอัปเกรดแพ็กเกจ", usage});
    next(); // Authoritative check + insert still run together in sellerTransaction.
  } catch (e) {next(e);}
};

