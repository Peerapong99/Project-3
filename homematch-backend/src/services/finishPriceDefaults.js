// Indicative THB per square meter; these are planning estimates, not retailer quotes.
const referenceDate = '2026-10-24';
const floorDefaults = [
  ['light-wood', 1200, 'พื้นลายไม้โทนสว่าง รวมวัสดุและติดตั้งระดับมาตรฐาน'],
  ['dark-wood', 1300, 'พื้นลายไม้โทนเข้ม รวมวัสดุและติดตั้งระดับมาตรฐาน'],
  ['tile', 850, 'กระเบื้องเซรามิกทั่วไป รวมวัสดุและติดตั้ง'],
  ['marble', 2500, 'กระเบื้องลายหินอ่อนทั่วไป รวมวัสดุและติดตั้ง ไม่ใช่หินแท้'],
  ['concrete', 600, 'พื้นปูนขัดเรียบทั่วไป ไม่รวมงานซ่อมปรับระดับพิเศษ'],
].map(([key, unitPrice, description]) => ({
  category: 'floor',
  key,
  unitPrice,
  priceSource: `HomeMatch ประมาณการเบื้องต้น ${referenceDate}: ${description}`,
}));

const wallDefaults = [
  ['white', 'สีขาว'],
  ['cream', 'สีครีม'],
  ['gray', 'สีเทา'],
  ['dark-gray', 'สีเทาเข้ม'],
  ['green', 'สีเขียว'],
  ['blue', 'สีฟ้า'],
  ['brown', 'สีน้ำตาล'],
  ['black', 'สีดำ'],
].map(([key, color]) => ({
  category: 'wall',
  key,
  unitPrice: 180,
  priceSource: `HomeMatch ประมาณการเบื้องต้น ${referenceDate}: สีทาผนังภายใน ${color} รวมสีและค่าแรงทามาตรฐาน`,
}));

const defaults = [...floorDefaults, ...wallDefaults];
module.exports = {referenceDate, defaults};
