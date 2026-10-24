const express = require("express");
const mongoose = require("mongoose");

const RoomDesign = require("../models/RoomDesign");
const { protect, allowRoles } = require("../middleware/authMiddleware");

const router = express.Router();

// ทุก API ต้อง Login ก่อน
router.use(protect);

// Read-only summary: ownership is enforced before reading prices or property details.
router.get('/:designId/price-summary', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.designId)) return res.status(400).json({status:false,message:'รหัสแบบไม่ถูกต้อง'});
    const design = await RoomDesign.findOne({_id:req.params.designId,userId:req.user._id})
      .populate('propertyId', 'title price').lean();
    if (!design) return res.status(404).json({status:false,message:'ไม่พบแบบที่คุณมีสิทธิ์เข้าถึง'});
    const {calculateDesignPrice} = require('../services/designPriceService');
    const summary = calculateDesignPrice(design, await catalogService.getDesignCatalog());
    res.json({status:true,design,summary:design.priceSnapshot || summary,currentSummary:summary,summarySource:design.priceSnapshot ? 'saved' : 'current'});
  } catch (error) { next(error); }
});


router.patch('/:designId/price-summary', async (req, res, next) => {
  try {
    const {designName, budget, expectedUpdatedAt} = req.body || {};
    if (!mongoose.isValidObjectId(req.params.designId)) return res.status(400).json({message:'รหัสแบบไม่ถูกต้อง'});
    if (typeof designName !== 'string' || !designName.trim() || designName.trim().length > 150) return res.status(400).json({message:'กรุณาระบุชื่อแบบ ไม่เกิน 150 ตัวอักษร'});
    const validBudget = budget === null || (typeof budget === 'number' && Number.isFinite(budget) && budget >= 0 && Number.isSafeInteger(Math.round(budget * 100)) && Math.abs(budget * 100 - Math.round(budget * 100)) < 0.000001);
    if (!validBudget) return res.status(400).json({message:'งบประมาณต้องเป็นตัวเลขไม่ติดลบและมีทศนิยมไม่เกิน 2 ตำแหน่ง'});
    if (typeof expectedUpdatedAt !== 'string' || !Number.isFinite(Date.parse(expectedUpdatedAt))) return res.status(400).json({message:'กรุณาโหลดแบบล่าสุดก่อนบันทึก'});
    const design = await RoomDesign.findOne({_id:req.params.designId,userId:req.user._id}).lean();
    if (!design) return res.status(404).json({message:'ไม่พบแบบที่คุณมีสิทธิ์เข้าถึง'});
    if (new Date(design.updatedAt).getTime() !== Date.parse(expectedUpdatedAt)) return res.status(409).json({message:'แบบถูกแก้ไขแล้ว กรุณาโหลดใหม่ก่อนบันทึก'});
    const {calculateDesignPrice} = require('../services/designPriceService');
    const summary = calculateDesignPrice(design, await catalogService.getDesignCatalog());
    // CAS prevents a concurrent editor save from attaching a snapshot to a different layout.
    const saved = await RoomDesign.findOneAndUpdate(
      {_id:design._id,userId:req.user._id,updatedAt:new Date(expectedUpdatedAt)},
      {$set:{designName:designName.trim(),budget,estimatedTotal:summary.grandTotal,priceSnapshot:summary}},
      {returnDocument:'after',runValidators:true}
    ).populate('propertyId','title price').lean();
    if (!saved) return res.status(409).json({message:'แบบถูกแก้ไขระหว่างบันทึก กรุณาโหลดใหม่'});
    res.json({status:true,design:saved,summary,currentSummary:summary,summarySource:'saved'});
  } catch (error) { next(error); }
});
// Catalog keys match the existing editor's type/floor id/wall id.
const DesignCatalogItem = require('../models/DesignCatalogItem');
const catalogService = require('../services/designCatalogService');
router.get('/catalog', async (req, res, next) => {
  try {
    res.json({status: true, items: await catalogService.getDesignCatalog(), isEstimate: true});
  } catch (error) { next(error); }
});
router.put('/catalog/:category/:key', allowRoles('admin'), async (req, res, next) => {
  try {
    const {category, key} = req.params;
    if (!catalogService.definitions.some(item => item.category === category && item.key === key)) {
      return res.status(404).json({status: false, message: 'ไม่พบรายการในแค็ตตาล็อก'});
    }
    const data = catalogService.validatePriceInput(req.body);
    await DesignCatalogItem.findOneAndUpdate({category, key}, {$set: data}, {upsert: true, new: true, runValidators: true});
    res.json({status: true, items: await catalogService.getDesignCatalog(), isEstimate: true});
  } catch (error) { next(error); }
});

// =====================================================
// VALIDATE ROOM QUERY
// =====================================================

const getRoomQuery = (req, res) => {
  const { propertyId, floor, roomId } = req.query;

  if (
    !mongoose.isValidObjectId(propertyId) ||
    floor === undefined ||
    floor === "" ||
    !roomId
  ) {
    res.status(400).json({
      status: false,
      message: "ข้อมูลบ้าน ชั้น หรือห้องไม่ถูกต้อง",
    });

    return null;
  }

  return {
    propertyId,
    floor: String(floor),
    roomId: String(roomId),
  };
};

// =====================================================
// GET MY DESIGNS
// ดึงแบบห้องทั้งหมดของ User ที่ Login
// =====================================================

router.get("/my-designs", async (req, res) => {
  try {
    const designs = await RoomDesign.find({
      userId: req.user._id,
    })
      .populate("propertyId", "title images")
      .sort({
        updatedAt: -1,
      })
      .lean();

    return res.json({
      status: true,
      count: designs.length,
      designs,
    });
  } catch (error) {
    console.error(
      "GET MY DESIGNS ERROR:",
      error
    );

    return res.status(500).json({
      status: false,
      message:
        "ไม่สามารถโหลดรายการแบบห้องได้",
    });
  }
});

// =====================================================
// GET ROOM DESIGN
// โหลดแบบห้องที่บันทึกไว้
// =====================================================

router.get("/", async (req, res) => {
  try {
    const query = getRoomQuery(
      req,
      res
    );

    if (!query) {
      return;
    }

    const design =
      await RoomDesign.findOne({
        userId: req.user._id,
        ...query,
      }).lean();

    return res.json({
      status: true,
      design,
    });
  } catch (error) {
    console.error(
      "GET ROOM DESIGN ERROR:",
      error
    );

    return res.status(500).json({
      status: false,
      message:
        "โหลดแบบห้องไม่สำเร็จ",
    });
  }
});

// =====================================================
// SAVE / UPDATE ROOM DESIGN
// =====================================================

router.put('/', async (req,res,next) => {
  try {
    const body=req.body || {};
    const {propertyId,roomId,floor,canvasSize,furniture,expectedUpdatedAt}=body;
    const bad=message=>{throw Object.assign(new Error(message),{status:400});};
    if(!mongoose.isObjectIdOrHexString(propertyId) || typeof roomId!=='string' || !roomId || roomId.length>150 || !Number.isInteger(Number(floor)) || Number(floor)<1 || !['string','number'].includes(typeof floor)) bad('ข้อมูลไม่ถูกต้อง กรุณาโหลดข้อมูลล่าสุดแล้วลองใหม่');
    if(!Array.isArray(furniture) || furniture.length>500) bad('ข้อมูลไม่ถูกต้อง กรุณาโหลดข้อมูลล่าสุดแล้วลองใหม่');
    if(body.room !== undefined && (typeof body.room!=='string' || body.room.length>150)) bad('ข้อมูลไม่ถูกต้อง กรุณาโหลดข้อมูลล่าสุดแล้วลองใหม่');
    if(canvasSize !== undefined && (!canvasSize || !['width','height'].every(key=>typeof canvasSize[key]==='number' && Number.isFinite(canvasSize[key]) && canvasSize[key]>0 && canvasSize[key]<=100000))) bad('ข้อมูลไม่ถูกต้อง กรุณาโหลดข้อมูลล่าสุดแล้วลองใหม่');
    const roomSize=body.roomSize || {width:5,height:6,unit:'meter'};
    if(!roomSize || !['width','height'].every(key=>typeof roomSize[key]==='number' && Number.isFinite(roomSize[key]) && roomSize[key]>0 && roomSize[key]<=10000) || roomSize.unit!=='meter') bad('ข้อมูลไม่ถูกต้อง กรุณาโหลดข้อมูลล่าสุดแล้วลองใหม่');
    const cleanFurniture=furniture.map(item=>{
      if(!item || typeof item.id!=='string' || !item.id || item.id.length>150 || typeof item.type!=='string' || !item.type || item.type.length>100 || (item.name!==undefined && (typeof item.name!=='string' || item.name.length>150))) bad('ข้อมูลไม่ถูกต้อง กรุณาโหลดข้อมูลล่าสุดแล้วลองใหม่');
      const result={id:item.id,type:item.type,name:item.name || ''};
      for(const key of ['x','y','rotation','realWidth','realHeight','width','height']) {
        const value=item[key] ?? 0;
        if(typeof value!=='number' || !Number.isFinite(value) || value<0 || value>100000) bad('ข้อมูลไม่ถูกต้อง กรุณาโหลดข้อมูลล่าสุดแล้วลองใหม่');
        result[key]=value;
      }
      return result;
    });
    const selectedFloor=body.selectedFloor || {id:'light-wood',name:'ไม้สว่าง'};
    const selectedWall=body.selectedWall || {id:'white',name:'ขาว',color:'#FFFFFF'};
    for(const selected of [selectedFloor,selectedWall]) if(!selected || typeof selected.id!=='string' || !selected.id || selected.id.length>100 || (selected.name!==undefined && (typeof selected.name!=='string' || selected.name.length>150))) bad('ข้อมูลไม่ถูกต้อง กรุณาโหลดข้อมูลล่าสุดแล้วลองใหม่');
    if(selectedWall.color!==undefined && (typeof selectedWall.color!=='string' || !/^#[0-9a-fA-F]{6}$/.test(selectedWall.color))) bad('ข้อมูลไม่ถูกต้อง กรุณาโหลดข้อมูลล่าสุดแล้วลองใหม่');
    require('../services/designPriceService').calculateDesignPrice({furniture:cleanFurniture},[]);
    const Property=require('../models/Property');
    const property=await Property.findOne({_id:propertyId,status:'approved'}).select('floorPlans').lean();
    if(!property) return res.status(404).json({status:false,message:'ข้อมูลไม่ถูกต้อง กรุณาโหลดข้อมูลล่าสุดแล้วลองใหม่'});
    const plan=property.floorPlans?.find(item=>String(item.floor)===String(floor));
    if(!plan?.rooms?.some(item=>String(item._id)===roomId)) bad('ข้อมูลไม่ถูกต้อง กรุณาโหลดข้อมูลล่าสุดแล้วลองใหม่');
    const identity={userId:req.user._id,propertyId,floor:String(floor),roomId};
    const existing=await RoomDesign.findOne(identity).lean();
    if(existing && (typeof expectedUpdatedAt!=='string' || Date.parse(expectedUpdatedAt)!==new Date(existing.updatedAt).getTime())) return res.status(409).json({status:false,code:'DESIGN_CONFLICT',message:'แบบถูกแก้ไขหรือลบแล้ว กรุณาโหลดใหม่ก่อนบันทึก'});
    if(!existing && expectedUpdatedAt != null) return res.status(409).json({status:false,code:'DESIGN_CONFLICT',message:'แบบถูกแก้ไขหรือลบแล้ว กรุณาโหลดใหม่ก่อนบันทึก'});
    const now=new Date(Math.max(Date.now(),existing?new Date(existing.updatedAt).getTime()+1:0));
    const design=await RoomDesign.findOneAndUpdate(
      {...identity,...(existing?{updatedAt:existing.updatedAt}:{})},
      {$set:{room:body.room || 'ห้องของคุณ',roomSize:{width:roomSize.width,height:roomSize.height,unit:'meter'},...(canvasSize?{canvasSize:{width:canvasSize.width,height:canvasSize.height}}:{}),selectedFloor:{id:selectedFloor.id,name:selectedFloor.name || ''},selectedWall:{id:selectedWall.id,name:selectedWall.name || '',color:selectedWall.color || '#FFFFFF'},furniture:cleanFurniture,priceSnapshot:null,estimatedTotal:null,updatedAt:now},$setOnInsert:{...identity,createdAt:now}},
      {upsert:!existing,returnDocument:'after',runValidators:true,timestamps:false}
    );
    if(!design) return res.status(409).json({status:false,code:'DESIGN_CONFLICT',message:'แบบถูกแก้ไขหรือลบแล้ว กรุณาโหลดใหม่ก่อนบันทึก'});
    res.json({status:true,message:'ดำเนินการสำเร็จ',design});
  } catch(error) {
    if(error.code===11000) return res.status(409).json({status:false,code:'DESIGN_CONFLICT',message:'แบบถูกแก้ไขหรือลบแล้ว กรุณาโหลดใหม่ก่อนบันทึก'});
    next(error);
  }
});

router.delete('/:designId', async (req,res,next) => {
  try {
    if(!mongoose.isObjectIdOrHexString(req.params.designId)) return res.status(400).json({message:'ข้อมูลไม่ถูกต้อง กรุณาโหลดข้อมูลล่าสุดแล้วลองใหม่'});
    const deleted=await RoomDesign.findOneAndDelete({_id:req.params.designId,userId:req.user._id});
    if(!deleted) return res.status(404).json({message:'ข้อมูลไม่ถูกต้อง กรุณาโหลดข้อมูลล่าสุดแล้วลองใหม่'});
    res.json({status:true,message:'ดำเนินการสำเร็จ'});
  } catch(error) {next(error);}
});

// =====================================================
// DELETE ROOM DESIGN
// =====================================================

router.delete(
  "/",
  async (req, res) => {
    try {
      const query =
        getRoomQuery(
          req,
          res
        );

      if (!query) {
        return;
      }

      const deletedDesign =
        await RoomDesign.findOneAndDelete(
          {
            userId:
              req.user._id,

            ...query,
          }
        );

      if (!deletedDesign) {
        return res
          .status(404)
          .json({
            status: false,

            message:
              "ไม่พบแบบห้องที่ต้องการลบ",
          });
      }

      return res.json({
        status: true,

        message:
          "ลบแบบห้องสำเร็จ",
      });
    } catch (error) {
      console.error(
        "DELETE ROOM DESIGN ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          status: false,

          message:
            "ลบแบบห้องไม่สำเร็จ",
        });
    }
  }
);

module.exports = router;
