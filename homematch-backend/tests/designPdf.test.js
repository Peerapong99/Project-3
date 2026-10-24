const {test} = require('node:test');
const assert = require('node:assert/strict');
const {buildDesignPdfHtml} = require('../../HomeMatchMobile/src/utils/designPdfHtml');
const {calculateDesignPrice} = require('../src/services/designPriceService');
const {mergeCatalog} = require('../src/services/designCatalogService');
const baseDesign = () => ({room:'ห้องนอน',floor:'2',propertyId:{title:'บ้านภาษาไทย',price:1000000},canvasSize:{width:300,height:360},selectedFloor:{id:'tile'},selectedWall:{id:'white',color:'#FFFFFF'},furniture:[{id:'1',type:'bed',name:'เตียง',x:10,y:20,width:60,height:80,rotation:90,realWidth:1,realHeight:2}]});
function document(overrides = {}) {
  const design = overrides.design || baseDesign();
  return buildDesignPdfHtml({design,summary:calculateDesignPrice(design,mergeCatalog([{category:'furniture',key:'bed',unitPrice:100,priceSource:'ราคาอ้างอิง'}])),designName:'แบบห้องของฉัน',budget:150,source:'saved',generatedAt:new Date('2026-10-14T00:00:00Z'),...overrides});
}
test('PDF document contains Thai metadata, layout, prices and budget separately from house price', () => {
  const html = document();
  for (const text of ['charset="utf-8"','lang="th"','HomeMatch','บ้านภาษาไทย','แบบห้องของฉัน','ห้องนอน','Bed.png','rotate(90deg)','100.00 บาท','150.00 บาท','50.00 บาท','1,000,000.00 บาท','ราคา ณ เวลาบันทึก','ราคาประมาณการ ไม่ใช่ราคาจำหน่ายจริง']) assert.ok(html.includes(text),text);
  assert.ok(html.includes('07:00:00'));
  assert.ok(html.includes('ยังไม่มีข้อมูลพื้นที่'));
  assert.ok(html.includes('รายการที่ยังไม่รวมในยอดประมาณการ'));
});
test('PDF safely escapes names and never loads user-controlled images or markup', () => {
  const design = baseDesign();
  design.propertyId.title='<script>alert(1)</script>';
  design.furniture[0].name='<img src="https://private.invalid">';
  const html=document({design,designName:'<b>name</b>'});
  assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<b>name</b>'));assert.ok(html.includes('&lt;b&gt;name&lt;/b&gt;'));
  assert.ok(!html.includes('src="https://private.invalid"'));
});
test('legacy and empty designs remain exportable, missing price never becomes zero in line items', () => {
  const design=baseDesign();delete design.canvasSize;
  const html=document({design,summary:calculateDesignPrice(design,mergeCatalog([])),budget:null,source:'current'});
  assert.ok(html.includes('ยังไม่มีข้อมูลราคา'));
  assert.ok(html.includes('ยังไม่ได้กำหนด'));
  assert.ok(html.includes('แบบเก่า'));
  assert.ok(html.includes('ราคาอ้างอิงปัจจุบัน'));
  design.furniture=[];delete design.selectedFloor;delete design.selectedWall;
  assert.ok(document({design}).includes('ยังไม่มีรายการตกแต่ง'));
});
test('all editor furniture images exist in the configured Android asset source', () => {
  const fs=require('fs'),path=require('path');
  for (const name of ['Bed','Sofa','Table','Cabinet','TV','Plant','Toilet','Sink','Bathtub']) assert.ok(fs.existsSync(path.resolve(__dirname,`../../HomeMatchMobile/src/assets/${name}.png`)));
});