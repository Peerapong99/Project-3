// All amounts originate from the server catalog, never furniture.unitPrice.
const STANDARD_WALL_HEIGHT_METERS = 2.8;

function calculateDesignPrice(design, catalog) {
  const invalid = message => { throw Object.assign(new Error(message), {status: 400}); };
  if (!Array.isArray(design?.furniture)) invalid('ข้อมูลเฟอร์นิเจอร์ไม่ถูกต้อง');
  const references = new Map(catalog.map(item => [`${item.category}:${item.key}`, item]));
  const groups = new Map();
  const ids = new Set();
  for (const item of design.furniture) {
    if (!item || typeof item.type !== 'string' || !item.type || !item.id || ids.has(String(item.id))) invalid('รายการเฟอร์นิเจอร์มีข้อมูลผิดรูปแบบหรือรหัสซ้ำ');
    ids.add(String(item.id));
    for (const field of ['x','y','width','height','realWidth','realHeight','rotation']) {
      if (item[field] !== undefined && (typeof item[field] !== 'number' || !Number.isFinite(item[field]) || item[field] < 0)) invalid('ตำแหน่งหรือขนาดเฟอร์นิเจอร์ไม่ถูกต้อง');
    }
    const group = groups.get(item.type) || {key:item.type, name:item.name || item.type, quantity:0};
    group.quantity++;
    groups.set(item.type, group);
  }
  function priceLine(category, key, name, quantity) {
    const reference = references.get(`${category}:${key}`);
    const price = reference?.unitPrice;
    const cents = typeof price === 'number' ? Math.round(price * 100) : null;
    const known = typeof price === 'number' && Number.isFinite(price) && price >= 0 && Number.isSafeInteger(cents) && Math.abs(price * 100 - cents) < 0.000001;
    const validQuantity = typeof quantity === 'number' && Number.isFinite(quantity) && quantity >= 0;
    const totalCents = known && validQuantity ? Math.round(cents * quantity) : null;
    if (totalCents !== null && !Number.isSafeInteger(totalCents)) invalid('ยอดรวมเกินขอบเขตที่รองรับ');
    return {category, key, name:reference?.name || name || key, unit:reference?.unit || (category === 'furniture' ? 'ชิ้น' : 'ตร.ม.'), quantity:validQuantity ? quantity : null,
      unitPrice:known ? price : null, total:totalCents === null ? null : totalCents / 100,
      priceSource:reference?.priceSource || '', priceUpdatedAt:reference?.updatedAt || null,
      missingPrice:!known, missingQuantity:!validQuantity};
  }
  const furnitureItems = [...groups.values()].map(item => priceLine('furniture', item.key, item.name, item.quantity));
  const roomWidth = design.roomSize?.width;
  const roomLength = design.roomSize?.height;
  for (const dimension of [roomWidth, roomLength]) {
    if (dimension !== undefined && dimension !== null &&
        (typeof dimension !== 'number' || !Number.isFinite(dimension) || dimension < 0)) {
      invalid('ขนาดห้องไม่ถูกต้อง');
    }
  }
  const hasRoomDimensions =
    typeof roomWidth === 'number' && roomWidth > 0 &&
    typeof roomLength === 'number' && roomLength > 0;
  const floorArea = hasRoomDimensions ? roomWidth * roomLength : null;
  const wallArea = hasRoomDimensions
    ? 2 * (roomWidth + roomLength) * STANDARD_WALL_HEIGHT_METERS
    : null;
  if ([floorArea, wallArea].some(area => area !== null && !Number.isFinite(area))) {
    invalid('ขนาดห้องเกินขอบเขตที่รองรับ');
  }
  const materialItems = [];
  if (design.selectedFloor?.id) materialItems.push(priceLine('floor', design.selectedFloor.id, design.selectedFloor.name, floorArea));
  if (design.selectedWall?.id) materialItems.push(priceLine('wall', design.selectedWall.id, design.selectedWall.name, wallArea));
  const sum = lines => {
    let total = 0;
    for (const line of lines) {
      if (line.total !== null) total += Math.round(line.total * 100);
      if (!Number.isSafeInteger(total)) invalid('ยอดรวมเกินขอบเขตที่รองรับ');
    }
    return total / 100;
  };
  const lines = [...furnitureItems, ...materialItems];
  const unpricedItems = lines.filter(line => line.missingPrice || line.missingQuantity);
  return {currency:'THB', isEstimate:true, furnitureItems, materialItems, additionalCosts:[],
    furnitureTotal:sum(furnitureItems), materialTotal:sum(materialItems), additionalCost:0,
    grandTotal:sum(lines), unpricedItems, isComplete:unpricedItems.length === 0,
    calculatedAt:new Date().toISOString()};
}
module.exports = {calculateDesignPrice};