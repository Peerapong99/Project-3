import {useState} from 'react';
import {Link,useParams} from 'react-router-dom';
import {Upload,ShieldCheck} from 'lucide-react';
import api from '../../services/Api';
import useResource from '../../services/useSubscriptionResource';
import {money,dateTime,buttonClass} from '../../services/subscriptionFormat';
import Layout from '../Subscription/SubscriptionLayout';
import {Loading,ErrorNotice,StatusBadge} from '../Subscription/SubscriptionUI';
export default function SubscriptionCheckout(){
 const {paymentId}=useParams();const {data,error,loading,reload}=useResource('/subscriptions/payments/'+paymentId,15000);
 const [file,setFile]=useState(null),[busy,setBusy]=useState(false),[actionError,setActionError]=useState('');
 const payment=data?.payment;const settings=payment?.paymentSettingsSnapshot;
 async function submit(event){event.preventDefault();setActionError('');if(!file)return setActionError("กรุณาเลือกหลักฐานการโอน");if(file.size>5*1024*1024)return setActionError("ไฟล์ต้องไม่เกิน 5MB");
 setBusy(true);try{const form=new FormData();form.append('paymentId',paymentId);form.append('slip',file);await api.post('/subscriptions/payments',form);setFile(null);reload();}catch(e){setActionError(e.response?.data?.message || e.message);}finally{setBusy(false);}}
 return <Layout title="ชำระค่าแพ็กเกจ" description="ตรวจสอบรายละเอียดและส่งหลักฐาน สิทธิ์จะเปิดหลังได้รับอนุมัติเท่านั้น">
 <ErrorNotice message={error} retry={reload}/><ErrorNotice message={actionError}/>{loading&&!payment?<Loading/>:payment&&<div className="grid items-start gap-6 md:grid-cols-2">
 <section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-lg font-semibold">รายละเอียดคำสั่งซื้อ</h2><p className="mt-4 text-2xl font-bold">{payment.planSnapshot.name}</p><p className="my-3 text-3xl font-bold text-[#0F9D8A]">{money(payment.amountSatang)}</p><p className="text-sm text-slate-500">{payment.planSnapshot.durationDays}  วัน ·  {payment.planSnapshot.listingLimit}  ประกาศ ·  {payment.planSnapshot.imageLimit}  รูป</p><div className="my-5"><StatusBadge status={payment.status}/></div><p className="break-all text-xs text-slate-400">คำสั่งซื้อ  {payment._id}</p><p className="mt-2 text-xs text-slate-500">ส่งหลักฐานภายใน  {dateTime(payment.orderExpiresAt)}</p>
 {payment.status==='pending'&&<p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">ส่งหลักฐานแล้ว กำลังรอตรวจสอบ แพ็กเกจปัจจุบันยังคงเดิม</p>}
 {payment.status==='approved'&&<div className="mt-5 space-y-4"><p className="flex gap-2 text-sm text-teal-700"><ShieldCheck size={20}/>อนุมัติแล้ว เปิดสิทธิ์สมาชิกเรียบร้อย</p><Link to="/seller/subscription" className={buttonClass}>ดูสมาชิกของฉัน</Link></div>}
 {payment.status==='rejected'&&<p className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">เหตุผล:  {payment.rejectionReason}</p>}
 {['rejected','expired'].includes(payment.status)&&<Link to="/seller/subscription/plans" className={'mt-5 '+buttonClass}>สร้างคำสั่งซื้อใหม่</Link>}
 </section>
 <section className="rounded-2xl border border-slate-200 bg-white p-6">
 {payment.mode==='simulation'?<div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900"><h2 className="font-bold">โหมดจำลอง — ไม่รับเงินจริง</h2><p className="mt-2 text-sm">ใช้รูปภาพทดสอบแทนหลักฐาน ไม่มีบัญชีรับเงิน และยอดนี้ไม่รวมในรายได้จริง</p></div>:<><h2 className="mb-4 text-lg font-semibold">ข้อมูลรับเงินที่ Admin ตั้งค่า</h2>{settings?.qrDataUrl&&<img src={settings.qrDataUrl} alt="QR รับเงินที่ Admin อัปโหลด" className="mx-auto mb-5 max-h-72 max-w-full rounded-xl object-contain"/>}{settings?.bankName&&<dl className="space-y-2 rounded-xl bg-slate-50 p-4 text-sm"><div>ธนาคาร:  {settings.bankName}</div><div>ชื่อบัญชี:  {settings.accountName}</div><div className="break-all font-semibold">เลขบัญชี:  {settings.accountNumber}</div></dl>}{settings?.promptPayId&&<p className="mt-3 break-all text-sm">PromptPay: {settings.promptPayId}</p>}<p className="mt-3 text-xs text-slate-500">ตรวจชื่อผู้รับและจำนวนเงินก่อนโอน</p></>}
 {payment.status==='awaiting_payment'&&<form onSubmit={submit} className="mt-6 space-y-4"><label className="block text-sm font-semibold">{payment.mode==='simulation'?"อัปโหลดรูปทดสอบ":"หลักฐานการโอน"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>setFile(e.target.files?.[0] || null)} className="mt-3 block w-full rounded-xl border border-dashed border-slate-300 p-4 text-sm"/></label><p className="text-xs text-slate-500">JPG, PNG หรือ WEBP ไม่เกิน 5MB</p><button disabled={busy || !file} className={buttonClass}><Upload size={18}/>{busy?"กำลังส่ง...":"ส่งหลักฐาน"}</button></form>}
 </section></div>}
 </Layout>;
}

