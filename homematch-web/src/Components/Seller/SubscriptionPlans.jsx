import {useRef,useState} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import {Check,Crown,Sparkles} from 'lucide-react';
import api from '../../services/Api';
import useResource from '../../services/useSubscriptionResource';
import {money,buttonClass} from '../../services/subscriptionFormat';
import Layout from '../Subscription/SubscriptionLayout';
import {Loading,ErrorNotice} from '../Subscription/SubscriptionUI';
export default function SubscriptionPlans(){
 const {data,error,loading,reload}=useResource('/subscriptions/plans');
 const [buying,setBuying]=useState(''),[actionError,setActionError]=useState('');
 const request=useRef(null);const navigate=useNavigate();
 async function choose(plan){
  setActionError('');setBuying(plan.code);
  if(!request.current || request.current.code!==plan.code)request.current={code:plan.code,key:crypto.randomUUID()};
  try{const result=await api.post('/subscriptions/subscribe',{planCode:plan.code},{headers:{'Idempotency-Key':request.current.key}});navigate('/seller/subscription/checkout/'+result.data.payment._id);}
  catch(e){setActionError(e.response?.data?.message || e.message);}finally{setBuying('');}
 }
 return <Layout title="แพ็กเกจสมาชิก" description="เลือกพื้นที่สำหรับธุรกิจของคุณ เปิดสิทธิ์หลัง Admin ตรวจสอบการชำระเงิน">
  <ErrorNotice message={error} retry={reload}/><ErrorNotice message={actionError}/>{loading&&!data?<Loading/>:
  <div className="grid gap-5 md:grid-cols-3">{data?.plans.map(plan=><article key={plan._id} className={'relative flex flex-col rounded-2xl border bg-white p-6 shadow-sm '+(plan.code==='premium'?'border-[#0F9D8A] ring-1 ring-[#0F9D8A]':'border-slate-200')}>
   {plan.code==='premium'&&<span className="absolute -top-3 left-6 rounded-full bg-[#0F9D8A] px-3 py-1 text-xs text-white">เหมาะสำหรับผู้ขายที่กำลังเติบโต</span>}
   {plan.code==='pro'?<Sparkles className="mb-4 text-[#0F9D8A]"/>:<Crown className="mb-4 text-[#0F9D8A]"/>}
   <h2 className="text-xl font-bold">{plan.name}</h2><p className="my-4 text-3xl font-bold">{money(plan.priceSatang)}<span className="block pt-1 text-sm font-normal text-slate-400">{plan.durationDays?'/ '+plan.durationDays+" วัน":"ใช้งานฟรี"}</span></p>
   <ul className="mb-8 flex-1 space-y-3 text-sm">{[
    "ลงประกาศได้ "+plan.listingLimit+" หลัง","รูปภาพ "+plan.imageLimit+" รูปต่อประกาศ",
    ...(plan.features.floorPlan2D?["แปลนบ้าน 2D"]:[]),...(plan.features.chat?["แชทกับผู้ซื้อ"]:[]),...(plan.features.appointments?["จัดการนัดหมาย"]:[]),
    ...(plan.features.analytics?["สถิติยอดเข้าชม"]:[]),...(plan.features.detailedAnalytics?["สถิติยอดเข้าชมรายวัน"]:[]),...(plan.features.featured?["แสดงเป็นประกาศแนะนำ"]:[])
   ].map(text=><li key={text} className="flex gap-2"><Check size={17} className="shrink-0 text-[#0F9D8A]"/>{text}</li>)}</ul>
   {plan.code==='free'?<Link to="/seller/subscription" className="rounded-xl border border-slate-200 px-5 py-3 text-center text-sm font-semibold">ดูสมาชิกของฉัน</Link>:<button disabled={!!buying} onClick={()=>choose(plan)} className={buttonClass}>{buying===plan.code?"กำลังสร้างคำสั่งซื้อ...":"เลือก "+plan.name}</button>}
  </article>)}</div>}
  <p className="text-sm text-slate-500">รูปห้องนับรวมในโควตารูปภาพ ส่วนรูปแปลนแยกต่างหาก แพ็กเกจหมดอายุจะกลับเป็น Free โดยไม่ลบประกาศเดิม</p>
 </Layout>;
}

