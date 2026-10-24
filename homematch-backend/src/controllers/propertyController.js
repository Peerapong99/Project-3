
const mongoose = require("mongoose");
const Property = require("../models/Property");
const membership = require('../services/subscriptionService');
const Subscription = require('../models/SellerSubscription');

// =====================================
// FIELDS
// =====================================

const editableFields = [
  "title",
  "description",
  "type",
  "price",
  "location",
  "bedrooms",
  "bathrooms",
  "area",
  "images",
  "floorPlans",
];

const pickEditableFields = (body = {}) => {
  const data = {};

  for (const field of editableFields) {
    if (body[field] !== undefined) {
      data[field] = body[field];
    }
  }

  return data;
};

// =====================================
// HELPERS
// =====================================

const isValidId = (id) =>
  mongoose.Types.ObjectId.isValid(id);

const isUploadedImage = (url, folder) =>
  typeof url === "string" &&
  new RegExp(
    `^/uploads/${folder}/[0-9]+-[0-9]+\\.(jpg|png|webp)$`
  ).test(url);

const handleError = (res, error) => {
  if (error.status) return res.status(error.status).json({message:error.message,code:error.code});
  if (
    error.name === "ValidationError" ||
    error.name === "CastError"
  ) {
    return res.status(400).json({
      message: error.message,
    });
  }

  console.error(error);

  return res.status(500).json({
    message: "เกิดข้อผิดพลาดในระบบ",
  });
};

const validatePrice = (price) => {
  if (
    price === undefined ||
    price === null ||
    String(price).trim() === "" ||
    !Number.isFinite(Number(price)) ||
    Number(price) <= 0
  ) {
    return "กรุณาระบุราคาที่มากกว่า 0 บาท";
  }

  return null;
};

// =====================================
// VALIDATE MEDIA
// =====================================

const validateMedia = (data) => {
  if (data.images !== undefined) {
    if (
      !Array.isArray(data.images) ||
      data.images.length > 30 ||
      !data.images.every((url) =>
        isUploadedImage(url, "properties")
      )
    ) {
      return "ข้อมูลรูปภาพบ้านไม่ถูกต้อง";
    }
  }

  if (data.floorPlans !== undefined) {
    if (
      !Array.isArray(data.floorPlans) ||
      data.floorPlans.length > 5
    ) {
      return "ข้อมูลแปลนบ้านไม่ถูกต้อง";
    }

    for (const plan of data.floorPlans) {
      if (
        !plan ||
        !Number.isInteger(plan.floor) ||
        plan.floor < 1 ||
        !isUploadedImage(
          plan.imageUrl,
          "floorplans"
        ) ||
        !Array.isArray(plan.rooms)
      ) {
        return "ข้อมูลแปลนบ้านไม่ถูกต้อง";
      }

      for (const room of plan.rooms) {
        if (
          !room ||
          typeof room.name !== "string" ||
          !room.name.trim() ||
          (room.images !== undefined && (!Array.isArray(room.images) || !room.images.every(url => isUploadedImage(url, "properties")))) ||
          !Number.isFinite(room.x) ||
          !Number.isFinite(room.y) ||
          room.x < 0 ||
          room.x > 100 ||
          room.y < 0 ||
          room.y > 100
        ) {
          return "ข้อมูลตำแหน่งห้องไม่ถูกต้อง";
        }
      }
    }
  }

  return null;
};

// =====================================
// VALIDATE GOOGLE MAPS
// =====================================

const isGoogleMapsUrl = (value) => {
  try {
    const url = new URL(value);

    if (url.protocol !== "https:") {
      return false;
    }

    const allowedHosts = [
      "maps.google.com",
      "www.google.com",
      "google.com",
      "maps.app.goo.gl",
      "goo.gl",
      "www.google.co.th",
      "google.co.th",
    ];

    return allowedHosts.includes(
      url.hostname.toLowerCase()
    );
  } catch {
    return false;
  }
};

const validateLocation = (location) => {
  if (location === undefined) {
    return null;
  }

  if (
    !location ||
    typeof location !== "object" ||
    Array.isArray(location)
  ) {
    return "ข้อมูลที่อยู่ไม่ถูกต้อง";
  }

  for (const key of [
    "address",
    "district",
    "province",
  ]) {
    if (location[key] !== undefined) {
      if (
        typeof location[key] !== "string" ||
        !location[key].trim()
      ) {
        return `ข้อมูล ${key} ไม่ถูกต้อง`;
      }
    }
  }

  if (location.googleMapsUrl !== undefined) {
    if (
      typeof location.googleMapsUrl !== "string"
    ) {
      return "ลิงก์ Google Maps ไม่ถูกต้อง";
    }

    const link =
      location.googleMapsUrl.trim();

    if (link && !isGoogleMapsUrl(link)) {
      return "กรุณาใส่ลิงก์ Google Maps ที่ถูกต้อง";
    }
  }

  const coordinates = [
    ["latitude", -90, 90],
    ["longitude", -180, 180],
  ];

  for (const [key, min, max] of coordinates) {
    const value = location[key];

    if (
      value !== undefined &&
      value !== null
    ) {
      if (
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        value < min ||
        value > max
      ) {
        return `ข้อมูล ${key} ไม่ถูกต้อง`;
      }
    }
  }

  return null;
};

const validatePropertyData = (data) => {
  return (
    (data.price !== undefined
      ? validatePrice(data.price)
      : null) ||
    validateMedia(data) ||
    validateLocation(data.location)
  );
};

// =====================================
// 1. SELLER - CREATE PROPERTY
// =====================================

exports.createProperty = async (req, res) => {
  try {
    const data = pickEditableFields(req.body);
    const validationError = validatePropertyData(data);
    if (validationError) return res.status(400).json({message: validationError});
    const property = await membership.sellerTransaction(req.user._id, async ({session,plan}) => {
      await membership.assertListingAvailable(req.user._id,session,plan);
      membership.assertImageLimit(data,plan);
      await require('../services/mediaUploadService').assertMediaOwnership(data,req.user._id,null,session);
      const [created] = await Property.create([{...data,seller:req.user._id,status:'pending'}],{session});
      return created;
    });
    return res.status(201).json({message:"เพิ่มประกาศสำเร็จ",property});
  } catch(error) {return handleError(res,error);}
};

// =====================================
// 2. SELLER - MY PROPERTIES
// =====================================

exports.getMyProperties = async (req, res) => {
  try {
    const properties = await Property.find({
      seller: req.user._id,
    }).sort({
      createdAt: -1,
    });

    return res.json({
      properties,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// =====================================
// 3. SELLER - MY STATS
// =====================================

exports.getMyStats = async (req, res) => {
  try {
    const properties = await Property.find({
      seller: req.user._id,
    }).select("status");

    return res.json({
      total: properties.length,

      pending: properties.filter(
        (p) => p.status === "pending"
      ).length,

      approved: properties.filter(
        (p) => p.status === "approved"
      ).length,

      rejected: properties.filter(
        (p) => p.status === "rejected"
      ).length,

      sold: properties.filter(
        (p) => p.status === "sold"
      ).length,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// =====================================
// 4. SELLER - UPDATE PROPERTY
// =====================================

exports.updateProperty = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({message:"ID ประกาศไม่ถูกต้อง"});
    const data = pickEditableFields(req.body);
    if (!Object.keys(data).length) return res.status(400).json({message:"ไม่มีข้อมูลที่ต้องการแก้ไข"});
    const validationError = validatePropertyData(data);
    if (validationError) return res.status(400).json({message:validationError});
    const isPriceOnly = Object.keys(data).length === 1 && data.price !== undefined;
    const property = await membership.sellerTransaction(req.user._id, async ({session,plan}) => {
      const existing = await Property.findOne({_id:req.params.id,seller:req.user._id}).session(session);
      if (!existing) membership.fail(404,'NOT_FOUND',"ไม่พบประกาศ");
      if (existing.status === 'sold') membership.fail(400,'PROPERTY_SOLD',"ไม่สามารถแก้ไขประกาศที่ขายแล้ว");
      const changes = {...data};
      if(changes.location) changes.location = {...existing.location.toObject(), ...changes.location};
      if(changes.price !== undefined) changes.price=Number(changes.price);
      const merged = {...existing.toObject(),...changes};
      membership.assertImageLimit(merged,plan,existing.toObject());
      await require('../services/mediaUploadService').assertMediaOwnership(merged,req.user._id,existing.toObject(),session);
      if (!isPriceOnly && existing.status === 'rejected') await membership.assertListingAvailable(req.user._id,session,plan);
      Object.assign(existing,changes);
      if (!isPriceOnly) {existing.status='pending';existing.rejectionReason='';}
      await existing.save({session}); return existing;
    });
    return res.json({message:isPriceOnly?"แก้ไขราคาสำเร็จ สถานะประกาศยังคงเดิม":"แก้ไขประกาศสำเร็จ รอ Admin ตรวจสอบอีกครั้ง",property});
  } catch(error) {return handleError(res,error);}
};

// =====================================
// 4.1 SELLER - UPDATE PRICE
// PATCH /api/properties/:id/price
// =====================================

exports.updatePropertyPrice = async (req,res) => {
  try {
    if(!isValidId(req.params.id)) return res.status(400).json({message:"ID ประกาศไม่ถูกต้อง"});
    const error=validatePrice(req.body?.price);if(error) return res.status(400).json({message:error});
    const property=await membership.sellerTransaction(req.user._id,async ({session})=>{
      const existing=await Property.findOne({_id:req.params.id,seller:req.user._id}).session(session);
      if(!existing) membership.fail(404,'NOT_FOUND',"ไม่พบประกาศหรือไม่มีสิทธิ์แก้ไข");
      if(existing.status==='sold') membership.fail(400,'PROPERTY_SOLD',"ไม่สามารถแก้ไขราคาบ้านที่ขายแล้ว");
      existing.price=Number(req.body.price);await existing.save({session});return existing;
    });
    return res.json({message:"แก้ไขราคาบ้านสำเร็จ",property});
  } catch(error){return handleError(res,error);}
};

// =====================================
// 5. SELLER - DELETE PROPERTY
// =====================================

exports.deleteProperty = async (req,res) => {
  try {
    if(!isValidId(req.params.id)) return res.status(400).json({message:"ID ประกาศไม่ถูกต้อง"});
    await membership.sellerTransaction(req.user._id,async ({session})=>{
      const property=await Property.findOneAndUpdate({_id:req.params.id,seller:req.user._id},{$set:{deletedAt:new Date(),status:'rejected'}},{session,returnDocument:'after'});
      if(!property) membership.fail(404,'NOT_FOUND',"ไม่พบประกาศ");
      await require('../models/PurchaseOffer').updateMany({property:property._id,status:'pending'},{$set:{status:'cancelled',respondedAt:new Date()}},{session});
      await require('../models/Appointment').updateMany({property:property._id,status:{$in:['pending','confirmed']}},{$set:{status:'cancelled'}},{session});
    });
    return res.json({message:"ลบประกาศสำเร็จ"});
  } catch(error){return handleError(res,error);}
};

// =====================================
// 6. ADMIN - ALL PROPERTIES
// =====================================

exports.getAllProperties = async (
  req,
  res
) => {
  try {
    const properties = await Property.find()
      .populate("seller", "name email")
      .sort({
        createdAt: -1,
      });

    return res.json({
      properties,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// =====================================
// 7. ADMIN - PROPERTY STATS
// =====================================

exports.getPropertyStats = async (
  req,
  res
) => {
  try {
    const properties = await Property.find().select(
      "status"
    );

    return res.json({
      total: properties.length,

      pending: properties.filter(
        (p) => p.status === "pending"
      ).length,

      approved: properties.filter(
        (p) => p.status === "approved"
      ).length,

      rejected: properties.filter(
        (p) => p.status === "rejected"
      ).length,

      sold: properties.filter(
        (p) => p.status === "sold"
      ).length,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// =====================================
// 8. ADMIN - REVIEW PROPERTY
// =====================================

exports.reviewProperty = async (req,res) => {
  try {
    const {status,rejectionReason}=req.body;
    if(!['approved','rejected'].includes(status)) return res.status(400).json({message:"สถานะไม่ถูกต้อง"});
    if(status==='rejected' && (typeof rejectionReason!=='string' || !rejectionReason.trim())) return res.status(400).json({message:"กรุณาระบุเหตุผลที่ปฏิเสธ"});
    if(!isValidId(req.params.id)) return res.status(400).json({message:"ID ประกาศไม่ถูกต้อง"});
    const candidate=await Property.findOne({_id:req.params.id,status:'pending'}).select('seller');
    if(!candidate) return res.status(404).json({message:"ไม่พบประกาศที่รอตรวจสอบ"});
    const property=await membership.sellerTransaction(candidate.seller,async ({session})=>{
      const existing=await Property.findOne({_id:req.params.id,status:'pending'}).session(session);
      if(!existing) membership.fail(409,'PROPERTY_STATE_CHANGED',"ประกาศนี้ตรวจสอบไปแล้ว");
      existing.status=status;existing.rejectionReason=status==='rejected'?rejectionReason.trim():'';
      await existing.save({session});return existing;
    });
    return res.json({message:"ตรวจสอบประกาศสำเร็จ",property});
  }catch(error){return handleError(res,error);}
};

// =====================================
// 9. PUBLIC - ALL APPROVED PROPERTIES
// =====================================

exports.getPublicProperties = async (req,res) => {
  try {
    const properties=await Property.find({status:'approved'}).populate('seller','name').lean();
    const featured=await Subscription.find({'currentMembership.plan.features.featured':true,'currentMembership.endsAt':{$gt:new Date()}}).select('seller').lean();
    const sellers=new Set(featured.map(s=>String(s.seller)));
    for(const property of properties) property.featured=sellers.has(String(property.seller?._id));
    properties.sort((a,b)=>Number(b.featured)-Number(a.featured) || b.createdAt-a.createdAt);
    return res.json({properties});
  }catch(error){return handleError(res,error);}
};

// =====================================
// 10. PUBLIC - PROPERTY DETAIL
// =====================================

exports.getPublicPropertyById = async (req,res) => {
  try {
    if(!isValidId(req.params.id)) return res.status(400).json({message:"ID ประกาศไม่ถูกต้อง"});
    const property=await Property.findOne({_id:req.params.id,status:'approved'}).populate('seller','name').lean();
    if(!property) return res.status(404).json({message:"ไม่พบประกาศ"});
    const day=new Date().toISOString().slice(0,10);
    // Count successful detail requests, not unique people. Track for all plans; gate access to reports.
    await Property.updateOne({_id:property._id,status:'approved'},{$inc:{viewCount:1,['dailyViews.'+day]:1}});
    const entitlement=await Subscription.exists({seller:property.seller?._id,'currentMembership.plan.features.featured':true,'currentMembership.endsAt':{$gt:new Date()}});
    property.featured=!!entitlement;
    return res.json({property});
  }catch(error){return handleError(res,error);}
};

// =====================================
// 11. SELLER - MARK AS SOLD
// =====================================

exports.markPropertyAsSold = async (req,res) => {
  try {
    if(!isValidId(req.params.id)) return res.status(400).json({message:"ID ประกาศไม่ถูกต้อง"});
    const property=await membership.sellerTransaction(req.user._id,async ({session})=>{
      const existing=await Property.findOne({_id:req.params.id,seller:req.user._id}).session(session);
      if(!existing) membership.fail(404,'NOT_FOUND',"ไม่พบประกาศ");
      if(existing.status!=='approved') membership.fail(400,'INVALID_STATUS',"สามารถปิดการขายได้เฉพาะประกาศที่อนุมัติแล้วเท่านั้น");
      existing.status='sold';await existing.save({session});
      await require('../models/PurchaseOffer').updateMany({property:existing._id,status:'pending'},{$set:{status:'cancelled',respondedAt:new Date()}},{session});
      await require('../models/Appointment').updateMany({property:existing._id,status:{$in:['pending','confirmed']}},{$set:{status:'cancelled'}},{session});
      return existing;
    });
    return res.json({message:"ปิดการขายเรียบร้อยแล้ว",property});
  }catch(error){return handleError(res,error);}
};
