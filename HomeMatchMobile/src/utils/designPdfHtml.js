const { calculateBudget } = require('./designBudget');
const assets = {
  bed: 'Bed.png',
  sofa: 'Sofa.png',
  table: 'Table.png',
  cabinet: 'Cabinet.png',
  tv: 'TV.png',
  plant: 'Plant.png',
  toilet: 'Toilet.png',
  sink: 'Sink.png',
  bathtub: 'Bathtub.png',
};
const colors = {
  'light-wood': '#D9B98C',
  'dark-wood': '#8B6848',
  tile: '#E7E5E4',
  marble: '#F1F1EF',
  concrete: '#C9CDD1',
};
const escapeHtml = value =>
  String(value ?? '').replace(
    /[&<>"']/g,
    char =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[
        char
      ]),
  );
const money = value =>
  typeof value === 'number' && Number.isFinite(value)
    ? `${value.toLocaleString('th-TH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} บาท`
    : 'ยังไม่มีข้อมูลราคา';
const number = value =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
function planHtml(design) {
  const furniture = design.furniture || [];
  const hasCanvas =
    design.canvasSize?.width > 0 && design.canvasSize?.height > 0;
  const w = hasCanvas
    ? design.canvasSize.width
    : Math.max(
        300,
        ...furniture.map(item => number(item.x) + number(item.width) + 8),
      );
  const h = hasCanvas
    ? design.canvasSize.height
    : Math.max(
        360,
        ...furniture.map(item => number(item.y) + number(item.height) + 8),
      );
  const scale = Math.min(480 / w, 420 / h);
  const wall = /^#[0-9a-f]{6}$/i.test(design.selectedWall?.color || '')
    ? design.selectedWall.color
    : '#FFFFFF';
  const placed = furniture
    .map(item => {
      const asset = assets[item.type];
      const imageScale = ['toilet', 'sink'].includes(item.type)
        ? 1.35
        : item.type === 'bathtub'
        ? 1.25
        : 1;
      return `<div class="placed" style="left:${number(item.x) * scale}px;top:${
        number(item.y) * scale
      }px;width:${number(item.width) * scale}px;height:${
        number(item.height) * scale
      }px;transform:rotate(${number(item.rotation)}deg)">${
        asset
          ? `<img src="${asset}" alt="${escapeHtml(
              item.name || item.type,
            )}" style="transform:scale(${imageScale})">`
          : `<span>${escapeHtml(item.name || item.type)}</span>`
      }</div>`;
    })
    .join('');
  return `<div class="plan" style="width:${w * scale}px;height:${
    h * scale
  }px;background:${
    colors[design.selectedFloor?.id] || '#E2E8F0'
  };border-color:${wall}">${placed}</div><p class="muted">ภาพประกอบแบบห้อง ไม่ใช่แปลนก่อสร้างหรือพื้นที่วัดจริง${
    hasCanvas ? '' : ' · แบบเก่าจัดภาพจากขอบเขตตำแหน่งที่บันทึก'
  }</p>`;
}
function buildDesignPdfHtml({
  design,
  summary,
  designName,
  budget,
  source,
  generatedAt = new Date(),
}) {
  if (
    !design ||
    !summary ||
    !Array.isArray(summary.furnitureItems) ||
    !Array.isArray(summary.materialItems)
  )
    throw new Error('ข้อมูลสำหรับ PDF ไม่ครบถ้วน');
  const budgetPlan = calculateBudget(summary.grandTotal, budget);
  const rows = [
    ...summary.furnitureItems,
    ...summary.materialItems,
    ...(summary.additionalCosts || []),
  ]
    .map(
      item =>
        `<tr><td>${
          assets[item.key]
            ? `<img class="thumb" src="${assets[item.key]}" alt="">`
            : ''
        }${escapeHtml(item.name)}${
          item.priceSource
            ? `<small>อ้างอิง: ${escapeHtml(item.priceSource)}</small>`
            : ''
        }</td><td>${
          item.quantity === null
            ? 'ยังไม่มีข้อมูลพื้นที่'
            : escapeHtml(`${item.quantity} ${item.unit || ''}`)
        }</td><td>${money(item.unitPrice)}</td><td>${
          item.total === null
            ? item.missingPrice
              ? 'ยังไม่มีข้อมูลราคา'
              : 'ยังคำนวณไม่ได้'
            : money(item.total)
        }</td></tr>`,
    )
    .join('');
  const omitted = (summary.unpricedItems || [])
    .map(
      item =>
        `<li>${escapeHtml(item.name)}: ${[
          item.missingPrice && 'ยังไม่มีข้อมูลราคา',
          item.missingQuantity && 'ยังไม่มีข้อมูลพื้นที่',
        ]
          .filter(Boolean)
          .join(' · ')}</li>`,
    )
    .join('');
  const dateText = value =>
    Number.isFinite(new Date(value).getTime())
      ? new Date(value).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })
      : '-';
  return `<!DOCTYPE html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>HomeMatch สรุปราคาตกแต่ง</title><style>
    body{font-family:sans-serif;color:#172B27;font-size:12px;line-height:1.65;margin:24px}h1{color:#0F9D8A;font-size:26px;margin:0}h2{font-size:18px;margin-top:20px}.muted,small{color:#64748B;font-size:10px}small{display:block}table{border-collapse:collapse;width:100%;table-layout:fixed}thead{display:table-header-group}th{background:#E5F5F0;text-align:left}td,th{border:1px solid #D8E6E1;padding:8px;overflow-wrap:anywhere}tr{break-inside:avoid;page-break-inside:avoid}td:first-child{width:38%}.thumb{width:32px;height:32px;object-fit:contain;vertical-align:middle;margin-right:6px}.plan{position:relative;border:6px solid;overflow:hidden;box-sizing:content-box}.placed{position:absolute}.placed img{width:100%;height:100%;object-fit:contain}.plan-block{break-inside:avoid;page-break-inside:avoid}.total{padding:16px;background:#E5F5F0;font-size:18px;font-weight:bold;break-inside:avoid}.notice{color:#92400E;background:#FFFBEB;padding:12px}dl{display:grid;grid-template-columns:140px auto}dd{margin:0}
  </style></head><body><h1>HomeMatch</h1><h2>สรุปราคาตกแต่งบ้านโดยประมาณ</h2><dl><dt>บ้าน / โครงการ</dt><dd>${escapeHtml(
    design.propertyId?.title || 'ประกาศบ้านไม่พร้อมใช้งาน',
  )}</dd><dt>ชื่อแบบ</dt><dd>${escapeHtml(
    designName || design.designName || design.room,
  )}</dd><dt>ห้อง / ชั้น</dt><dd>${escapeHtml(design.room)} / ${escapeHtml(
    design.floor,
  )}</dd><dt>วันที่จัดทำ</dt><dd>${escapeHtml(
    dateText(generatedAt),
  )} (เวลาไทย)</dd><dt>ข้อมูลราคา</dt><dd>${
    source === 'saved' ? 'ราคา ณ เวลาบันทึก' : 'ราคาอ้างอิงปัจจุบัน'
  } · ${escapeHtml(dateText(summary.calculatedAt))}</dd></dl>
  <p>ราคาซื้อบ้าน: ${money(
    design.propertyId?.price,
  )} — แยกจากค่าตกแต่ง</p><div class="plan-block"><h2>ภาพตัวอย่างแบบห้อง 2D</h2>${planHtml(
    design,
  )}</div><h2>รายการเฟอร์นิเจอร์และวัสดุ</h2><table><thead><tr><th>รายการ</th><th>จำนวน</th><th>ราคาต่อหน่วย</th><th>ราคารวม</th></tr></thead><tbody>${
    rows || '<tr><td colspan="4">ยังไม่มีรายการตกแต่ง</td></tr>'
  }</tbody></table>
  ${
    omitted
      ? `<div class="notice"><b>รายการที่ยังไม่รวมในยอดประมาณการ</b><ul>${omitted}</ul></div>`
      : ''
  }<h2>งบประมาณตกแต่ง</h2><p>งบประมาณ: ${
    budget === null ? 'ยังไม่ได้กำหนด' : money(budget)
  }</p>${
    budgetPlan
      ? `<p>เงินคงเหลือ: ${money(budgetPlan.remaining)} · เกินงบ: ${money(
          budgetPlan.overBudget,
        )}</p>`
      : ''
  }<div class="total">${
    summary.isComplete ? 'รวมราคาตกแต่งโดยประมาณ' : 'ยอดเฉพาะรายการที่คำนวณได้'
  }: ${money(
    summary.grandTotal,
  )}</div><p>ราคาประมาณการ ไม่ใช่ราคาจำหน่ายจริง ไม่รวมราคาซื้อบ้าน
  พื้นคำนวณจากขนาดจำลอง 5 × 6 ม. และผนังคำนวณจากรอบห้องสูง 2.8 ม.
  โดยไม่หักพื้นที่ประตูและหน้าต่าง${
    summary.isComplete ? '' : ' และยังไม่รวมรายการที่ไม่มีราคาหรือพื้นที่จริง'
  }</p><p class="muted">เอกสารใช้ชื่อแบบและงบประมาณจากหน้าสรุป การส่งออกไม่ได้บันทึกหรือเปลี่ยนแบบในระบบ</p></body></html>`;
}
module.exports = { buildDesignPdfHtml, escapeHtml };
