import {useState} from 'react';
import {Menu,Crown} from 'lucide-react';
import {useNavigate} from 'react-router-dom';
import SellerSidebar from '../Seller/SellerSidebar';
import AdminSidebar from '../Admin/AdminSidebar';
export default function SubscriptionLayout({title,description,admin=false,children}) {
  const [open,setOpen]=useState(false);
  const navigate=useNavigate();
  let user=null;
  try {user=JSON.parse(sessionStorage.getItem('user') || 'null');}catch { /* Invalid cached profile does not block navigation. */ }
  return <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B]">
    {admin?<AdminSidebar activeMenu="subscriptions" setActiveMenu={menu=>navigate('/admin/dashboard',{state:{menu}})} isOpen={open} setIsOpen={setOpen} user={user}/>:<SellerSidebar isOpen={open} setIsOpen={setOpen} user={user}/>}
    <div className="lg:ml-64">
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:px-8">
        <button onClick={()=>setOpen(true)} className="rounded-lg p-2 lg:hidden" aria-label="เปิดเมนู"><Menu size={22}/></button>
        <Crown className="text-[#0F9D8A]" size={24}/><span className="font-semibold">HomeMatch Membership</span>
      </header>
      <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-8">
        <div><h1 className="text-2xl font-bold sm:text-3xl">{title}</h1><p className="mt-2 text-sm leading-6 text-slate-500">{description}</p></div>
        {children}
      </main>
    </div>
  </div>;
}

