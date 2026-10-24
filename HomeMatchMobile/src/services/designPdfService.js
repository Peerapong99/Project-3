import { NativeModules, Platform } from 'react-native';
import { getDesignPriceSummary } from './roomDesignService';
import { buildDesignPdfHtml } from '../utils/designPdfHtml';

export async function exportDesignPdf({
  designId,
  expectedUpdatedAt,
  designName,
  budget,
  useCurrentPrices,
}) {
  if (Platform.OS !== 'android')
    throw new Error('การส่งออก PDF นี้รองรับ Android');
  const printer = NativeModules.HomeMatchPdf;
  if (!printer?.printHtml)
    throw new Error('กรุณาสร้างและติดตั้งแอป Android ใหม่เพื่อเปิดใช้ PDF');
  // Reauthenticate ownership and avoid exporting a layout different from the visible preview.
  const result = await getDesignPriceSummary(designId);
  if (!result?.status || !result.design || !result.summary)
    throw new Error('โหลดข้อมูล PDF ไม่สำเร็จ');
  if (result.design.updatedAt !== expectedUpdatedAt)
    throw new Error('แบบถูกแก้ไขแล้ว กรุณาโหลดสรุปราคาใหม่ก่อนส่งออก');
  const summary = useCurrentPrices ? result.currentSummary : result.summary;
  const html = buildDesignPdfHtml({
    design: result.design,
    summary,
    designName,
    budget,
    source: useCurrentPrices ? 'current' : result.summarySource,
  });
  const title = `HomeMatch-${(designName || result.design.room || 'Design')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '')
    .slice(0, 80)}`;
  // Resolves when system print UI opens, not when a file has been saved.
  return printer.printHtml(html, title);
}
