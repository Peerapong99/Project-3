
const express = require("express");

const {
  createOffer,
  getMyOffers,
  cancelOffer,
  getSellerOffers,
  respondOffer,
} = require("../controllers/offerController");

const router = express.Router();

const {protect, allowRoles} = require('../middleware/authMiddleware');
router.use(protect);

// Buyer
router.post("/", allowRoles("buyer"), createOffer);
router.get("/my", allowRoles("buyer"), getMyOffers);
router.patch(
  "/:id/cancel",
  allowRoles("buyer"),
  cancelOffer
);

// Seller
router.get(
  "/seller",
  allowRoles("seller"),
  getSellerOffers
);

router.patch(
  "/:id/respond",
  allowRoles("seller"),
  respondOffer
);

module.exports = router;
