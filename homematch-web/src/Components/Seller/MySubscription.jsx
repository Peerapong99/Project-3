import {useState} from 'react';
import {Link} from 'react-router-dom';
import {Crown,House,BarChart3} from 'lucide-react';
import useResource from '../../services/useSubscriptionResource';
import {dateTime,buttonClass} from '../../services/subscriptionFormat';
import Layout from '../Subscription/SubscriptionLayout';
import {Loading,ErrorNotice,Pagination} from '../Subscription/SubscriptionUI';
function Analytics(){
 const {data,error,loading,reload}=useResource('/subscriptions/analytics');
 return <section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><BarChart3 size={20}/>สถิติประกาศ</h2><ErrorNotice message={error} retry={reload}/>{loading&&!data?<Loading/>:<>
 <p className="mb-4 text-sm text-slate-500">ยอดเปิดรายละเอียดรวม  {data?.totalViews || 0}  ครั้ง (จำนวนการเปิดหน้า ไม่ใช่ผู้ชมไม่ซ้ำ)</p>
 <div className="space-y-3">{data?.properties.map(property=><div key={property._id} className="rounded-xl bg-slate-50 p-4"><div className="flex justify-between gap-4"><span className="font-medium">{property.title}</span><span className="shrink-0">{property.views}  ครั้ง</span></div>{data.detailed&&<div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">{Object.entries(property.dailyViews).sort(([a],[b])=>b.localeCompare(a)).slice(0,30).map(([day,count])=><span key={day} className="rounded-lg border bg-white px-2 py-1">{day}: {count}</span>)}{!Object.keys(property.dailyViews).length&&"ยังไม่มีข้อมูลรายวัน"}</div>}</div>)}{!data?.properties.length&&<p className="text-sm text-slate-500">ยังไม่มีประกาศ</p>}</div></>}
 </section>;
}
export default function MySubscription(){
 const state=useResource('/subscriptions/me',30000);
 const [page,setPage]=useState(1);
 const history=useResource('/subscriptions/history?page='+page);
 const data=state.data;
 const percentage=data?Math.min(100,(data.usage.used/data.usage.listingLimit)*100):0;
 return <Layout title="สมาชิกของฉัน" description="สิทธิ์ปัจจุบัน โควตาประกาศ และประวัติแพ็กเกจของคุณ">
 <ErrorNotice message={state.error} retry={state.reload}/>{state.loading&&!data?<Loading/>:data&&<>
 <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"><div className="flex flex-wrap items-start justify-between gap-5"><div><Crown className="mb-3 text-[#0F9D8A]"/><p className="text-sm text-slate-500">แพ็กเกจปัจจุบัน</p><h2 className="mt-1 text-3xl font-bold">{data.plan.name}</h2></div><Link to="/seller/subscription/plans" className={buttonClass}>{data.plan.code==='free'?"อัปเกรดแพ็กเกจ":"ต่ออายุ / อัปเกรด"}</Link></div>
 <div className="mt-6 grid gap-4 sm:grid-cols-2"><div><p className="text-sm text-slate-500">เริ่มต้น</p><p className="mt-1 font-medium">{dateTime(data.startsAt)}</p></div><div><p className="text-sm text-slate-500">หมดอายุ</p><p className="mt-1 font-medium">{dateTime(data.endsAt)}</p></div></div>
 <div className="mt-6"><div className="mb-3 flex justify-between gap-3 text-sm"><span className="flex items-center gap-2"><House size={18}/>ประกาศที่ใช้</span><strong>{data.usage.used}/{data.usage.listingLimit}  หลัง</strong></div><div role="progressbar" aria-label="โควตาประกาศ" aria-valuenow={data.usage.used} aria-valuemin={0} aria-valuemax={Math.max(data.usage.used,data.usage.listingLimit)} className="h-3 overflow-hidden rounded-full bg-slate-100"><div className={'h-full rounded-full '+(data.usage.overLimit?'bg-amber-500':'bg-[#0F9D8A]')} style={{width:percentage+'%'}}/></div><p className="mt-2 text-sm text-slate-500">เหลือ  {data.usage.remaining}  หลัง · รูปภาพไม่เกิน  {data.plan.imageLimit}  รูปต่อประกาศ</p></div>
 {data.usage.overLimit&&<p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">ประกาศเดิมยังอยู่ครบ ขณะนี้เกินโควตา Free กรุณาอัปเกรดหรือลดจำนวนประกาศก่อนสร้างใหม่</p>}
 </section>{data.plan.features.analytics&&<Analytics/>}</>}
 <section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="mb-4 text-lg font-semibold">ประวัติสมาชิก</h2><ErrorNotice message={history.error} retry={history.reload}/>{history.loading?<Loading/>:<div className="space-y-3">{history.data?.history.map(event=><div key={event._id} className="flex flex-wrap justify-between gap-2 border-b border-slate-100 pb-3 text-sm"><span>{({free_started:"เริ่มใช้ Free",activation:"เปิดสมาชิก",upgrade:"อัปเกรด",renewal:"ต่ออายุ",expired:"หมดอายุ"})[event.type]}  ·  {event.from?event.from+" → ":''}{event.to}</span><span className="text-slate-500">{dateTime(event.at)}</span></div>)}</div>}<div className="mt-4"><Pagination page={page} total={history.data?.total || 0} onChange={setPage}/></div></section>
 </Layout>;
}

