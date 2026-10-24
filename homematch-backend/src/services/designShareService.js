const mongoose = require('mongoose');
const RoomDesign = require('../models/RoomDesign');
const Property = require('../models/Property');
const {getDesignCatalog} = require('./designCatalogService');
const {calculateDesignPrice} = require('./designPriceService');
const fail = (status,message) => {throw Object.assign(new Error(message),{status});};
async function buildSharedDesign({designId,expectedUpdatedAt,pricingMode,userId,role,conversation}) {
  if (role !== 'buyer' || String(conversation.buyer) !== String(userId)) fail(403,'เฉพาะผู้ซื้อเจ้าของแบบเท่านั้นที่แชร์ได้');
  if (!mongoose.isValidObjectId(designId) || !['saved','current'].includes(pricingMode)) fail(400,'ข้อมูลการแชร์แบบไม่ถูกต้อง');
  const design=await RoomDesign.findOne({_id:designId,userId}).lean();
  if (!design) fail(404,'ไม่พบแบบที่คุณมีสิทธิ์แชร์');
  if (String(design.propertyId) !== String(conversation.property)) fail(400,'แบบไม่เกี่ยวข้องกับบ้านในบทสนทนานี้');
  if (!expectedUpdatedAt || !Number.isFinite(Date.parse(expectedUpdatedAt)) || new Date(design.updatedAt).getTime() !== Date.parse(expectedUpdatedAt)) fail(409,'แบบถูกแก้ไขแล้ว กรุณาโหลดใหม่ก่อนแชร์');
  const property=await Property.findById(design.propertyId).select('title price seller status').lean();
  if (!property || property.status !== 'approved' || String(property.seller) !== String(conversation.seller)) fail(403,'ประกาศหรือผู้ขายไม่พร้อมรับแบบนี้');
  const summary = pricingMode === 'saved' && design.priceSnapshot ? design.priceSnapshot : calculateDesignPrice(design,await getDesignCatalog());
  // Immutable copy in the existing chat Message; never grants access to future edits.
  return {designId:String(design._id),sharedAt:new Date().toISOString(),summarySource:pricingMode === 'saved' && design.priceSnapshot ? 'saved' : 'current',summary,
    design:{designName:design.designName || design.room,budget:design.budget ?? null,propertyId:{_id:String(design.propertyId),title:property.title,price:property.price},room:design.room,floor:design.floor,roomId:design.roomId,roomSize:design.roomSize,canvasSize:design.canvasSize,selectedFloor:design.selectedFloor,selectedWall:design.selectedWall,furniture:design.furniture,updatedAt:design.updatedAt}};
}
module.exports={buildSharedDesign};