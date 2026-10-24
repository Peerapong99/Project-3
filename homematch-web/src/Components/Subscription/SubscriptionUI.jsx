import {Loader2} from 'lucide-react';
export function Loading(){return <div role="status" className="flex items-center gap-2 rounded-2xl bg-white p-8 text-slate-500"><Loader2 className="animate-spin" size={20}/>กำลังโหลด...</div>;}
export function ErrorNotice({message,retry}){if(!message)return null;return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{message}{retry&&<button onClick={retry} className="ml-3 underline">ลองอีกครั้ง</button>}</div>;}
export function StatusBadge({status}){
 const labels={awaiting_payment:"รอส่งหลักฐาน",pending:"รอตรวจสอบ",approved:"อนุมัติแล้ว",rejected:"ปฏิเสธ",expired:"หมดอายุ"};
 const colors={awaiting_payment:'bg-slate-100 text-slate-600',pending:'bg-amber-50 text-amber-700',approved:'bg-teal-50 text-teal-700',rejected:'bg-red-50 text-red-700',expired:'bg-slate-100 text-slate-600'};
 return <span className={'inline-block rounded-full px-3 py-1 text-xs font-semibold '+(colors[status] || colors.expired)}>{labels[status] || status}</span>;
}
export function Pagination({page,total,limit=20,onChange}){return <div className="flex items-center justify-end gap-3 text-sm"><span>{total}  รายการ · หน้า  {page}</span><button disabled={page<=1} onClick={()=>onChange(page-1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">ก่อนหน้า</button><button disabled={page*limit>=total} onClick={()=>onChange(page+1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">ถัดไป</button></div>;}

