const CatalogItem = require('../models/DesignCatalogItem');

const definitions = [
  ['furniture', 'bed', 'เตียง', 'ชิ้น'],
  ['furniture', 'sofa', 'โซฟา', 'ชิ้น'],
  ['furniture', 'table', 'โต๊ะ', 'ชิ้น'],
  ['furniture', 'cabinet', 'ตู้', 'ชิ้น'],
  ['furniture', 'tv', 'ทีวี', 'ชิ้น'],
  ['furniture', 'plant', 'ต้นไม้', 'ชิ้น'],
  ['furniture', 'toilet', 'ชักโครก', 'ชิ้น'],
  ['furniture', 'sink', 'อ่างล้างหน้า', 'ชิ้น'],
  ['furniture', 'bathtub', 'อ่างอาบน้ำ', 'ชิ้น'],
  ['floor', 'light-wood', 'ไม้สว่าง', 'ตร.ม.'],
  ['floor', 'dark-wood', 'ไม้เข้ม', 'ตร.ม.'],
  ['floor', 'tile', 'กระเบื้อง', 'ตร.ม.'],
  ['floor', 'marble', 'หินอ่อน', 'ตร.ม.'],
  ['floor', 'concrete', 'ปูน', 'ตร.ม.'],
  ['wall', 'white', 'ขาว', 'ตร.ม.'],
  ['wall', 'cream', 'ครีม', 'ตร.ม.'],
  ['wall', 'gray', 'เทา', 'ตร.ม.'],
  ['wall', 'dark-gray', 'เทาเข้ม', 'ตร.ม.'],
  ['wall', 'green', 'เขียว', 'ตร.ม.'],
  ['wall', 'blue', 'ฟ้า', 'ตร.ม.'],
  ['wall', 'brown', 'น้ำตาล', 'ตร.ม.'],
  ['wall', 'black', 'ดำ', 'ตร.ม.'],
].map(([category, key, name, unit]) => ({category, key, name, unit}));

function validatePriceInput(body) {
  const price = body?.unitPrice;
  if (price !== null && (typeof price !== 'number' || !Number.isFinite(price) || price < 0 || !Number.isSafeInteger(Math.round(price * 100)) || Math.abs(price * 100 - Math.round(price * 100)) > 0.000001)) {
    throw Object.assign(new Error('ราคาต้องเป็นตัวเลขไม่ติดลบ มีทศนิยมไม่เกิน 2 ตำแหน่ง หรือ null เมื่อไม่มีราคา'), {status: 400});
  }
  const source = body?.priceSource;
  if (typeof source !== 'string' || source.length > 500 || (price !== null && !source.trim())) {
    throw Object.assign(new Error('กรุณาระบุแหล่งอ้างอิงราคา ไม่เกิน 500 ตัวอักษร'), {status: 400});
  }
  return {unitPrice: price, priceSource: source.trim()};
}

function mergeCatalog(records) {
  const indexed = new Map(records.map(record => [`${record.category}:${record.key}`, record]));
  return definitions.map(item => {
    const record = indexed.get(`${item.category}:${item.key}`);
    const price = record?.unitPrice;
    const valid = typeof price === 'number' && Number.isFinite(price) && price >= 0 && Number.isSafeInteger(Math.round(price * 100)) && Math.abs(price * 100 - Math.round(price * 100)) < 0.000001;
    return {...item, currency: 'THB', unitPrice: valid ? price : null,
      priceStatus: valid ? 'available' : 'missing',
      priceSource: record?.priceSource || '', updatedAt: record?.updatedAt || null};
  });
}

async function getDesignCatalog() {
  return mergeCatalog(await CatalogItem.find({}).lean());
}

// Insert-only: preserve custom prices, explicit zero, and an admin's intentional null.
async function seedFurniturePrices() {
  const {defaults} = require('./furniturePriceDefaults');
  return seedCatalogDefaults(defaults);
}
async function seedCatalogDefaults(defaults) {
  await CatalogItem.init();
  const result = await CatalogItem.bulkWrite(defaults.map(item => ({updateOne:{
    filter:{category:item.category,key:item.key},update:{$setOnInsert:item},upsert:true,
  }})));
  return {inserted:result.upsertedCount,total:defaults.length};
}
async function seedDefaultDesignPrices() {
  const {defaults: furnitureDefaults} = require('./furniturePriceDefaults');
  const {defaults: finishDefaults} = require('./finishPriceDefaults');
  return seedCatalogDefaults([...furnitureDefaults, ...finishDefaults]);
}
module.exports = {definitions, validatePriceInput, mergeCatalog, getDesignCatalog, seedFurniturePrices, seedDefaultDesignPrices};