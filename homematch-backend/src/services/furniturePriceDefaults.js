// HomeMatch planning estimates, not retailer quotations. THB per placed item.
const referenceDate = '2026-10-16';
const defaults = [
  ['bed',15900,'เตียง 6 ฟุตพร้อมที่นอนระดับกลาง'],
  ['sofa',12900,'โซฟาผ้า 3 ที่นั่ง'],
  ['table',5900,'โต๊ะอเนกประสงค์หรือโต๊ะทานอาหาร ไม่รวมเก้าอี้'],
  ['cabinet',8900,'ตู้เก็บของสำเร็จรูประดับกลาง'],
  ['tv',12900,'สมาร์ตทีวีประมาณ 55 นิ้ว'],
  ['plant',790,'ต้นไม้ตกแต่งพร้อมกระถาง'],
  ['toilet',4900,'ชักโครกพร้อมฝารองนั่ง'],
  ['sink',2900,'อ่างล้างหน้าเฉพาะตัวอ่าง ไม่รวมก๊อกและตู้'],
  ['bathtub',15900,'อ่างอาบน้ำอะคริลิกทั่วไป ไม่รวมระบบนวด'],
].map(([key,unitPrice,description])=>({category:'furniture',key,unitPrice,
  priceSource:`HomeMatch ประมาณการระดับกลาง ${referenceDate}: ${description}; ไม่รวมค่าขนส่ง ติดตั้ง และงานระบบ`}));
module.exports={referenceDate,defaults};
