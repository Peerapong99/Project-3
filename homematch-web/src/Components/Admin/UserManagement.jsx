import {useCallback,useEffect,useState} from 'react';
import {Search,RefreshCw,ShieldBan,ShieldCheck} from 'lucide-react';
import api from '../../services/Api';
import useDialogFocus from '../../services/useDialogFocus';

export default function UserManagement() {
  const [users,setUsers]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const [search,setSearch]=useState(''),[role,setRole]=useState('all'),[status,setStatus]=useState('all');
  const [target,setTarget]=useState(null),[reason,setReason]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
  const dialogRef=useDialogFocus(Boolean(target),busy,()=>setTarget(null));
  const load=useCallback(async()=>{
    setLoading(true);setError('');
    try {const result=await api.get('/admin/users');setUsers(result.data.users || []);}
    catch(failure) {setError(failure.response?.data?.message || 'โหลดสมาชิกไม่สำเร็จ');}
    finally {setLoading(false);}
  },[]);
  useEffect(()=>{
    let active=true;
    api.get('/admin/users').then(result=>{if(active)setUsers(result.data.users || []);})
      .catch(failure=>{if(active)setError(failure.response?.data?.message || 'โหลดสมาชิกไม่สำเร็จ');})
      .finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[]);
  const visible=users.filter(user=>(role==='all' || user.role===role) && (status==='all' || (status==='banned')===!!user.isBanned) && `${user.name} ${user.email} ${user.phone || ''}`.toLowerCase().includes(search.trim().toLowerCase()));
  const open=user=>{setTarget(user);setReason('');setError('');setNotice('');};
  const submit=async event=>{
    event.preventDefault();if(busy || !target) return;
    setBusy(true);setError('');
    try {
      const result=await api.patch(`/admin/users/${target._id}/ban`,{isBanned:!target.isBanned,reason});
      setUsers(previous=>previous.map(user=>user._id===target._id ? result.data.user : user));
      setNotice(result.data.message);setTarget(null);
    } catch(failure) {setError(failure.response?.data?.message || 'เปลี่ยนสถานะไม่สำเร็จ');}
    finally {setBusy(false);}
  };
  const input='rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#0F9D8A]';
  return <section className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold text-slate-800">จัดการผู้ใช้</h2><p className="mt-1 text-sm text-slate-500">ผู้ซื้อและผู้ขาย · แบนหรือคืนสิทธิ์การใช้งานบัญชี</p></div><button disabled={busy} onClick={load} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm"><RefreshCw size={16}/>รีเฟรช</button></div>
    <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-white p-4"><p className="text-sm text-slate-500">สมาชิกทั้งหมด</p><strong className="text-2xl">{users.length}</strong></div><div className="rounded-xl bg-white p-4"><p className="text-sm text-slate-500">ใช้งานปกติ</p><strong className="text-2xl text-[#0F9D8A]">{users.filter(user=>!user.isBanned).length}</strong></div><div className="rounded-xl bg-white p-4"><p className="text-sm text-slate-500">ถูกแบน</p><strong className="text-2xl text-red-600">{users.filter(user=>user.isBanned).length}</strong></div></div>
    <div className="flex flex-wrap gap-3"><label className="relative min-w-60 flex-1"><Search className="absolute left-3 top-3.5 text-slate-400" size={17}/><input aria-label="ค้นหาสมาชิก" value={search} onChange={event=>setSearch(event.target.value)} placeholder="ค้นหาชื่อ อีเมล หรือเบอร์โทร" className={`${input} w-full pl-10`}/></label><select aria-label="ประเภทสมาชิก" className={input} value={role} onChange={event=>setRole(event.target.value)}><option value="all">ทุกประเภท</option><option value="buyer">ผู้ซื้อ</option><option value="seller">ผู้ขาย</option><option value="admin">Admin</option></select><select aria-label="สถานะสมาชิก" className={input} value={status} onChange={event=>setStatus(event.target.value)}><option value="all">ทุกสถานะ</option><option value="active">ใช้งานปกติ</option><option value="banned">ถูกแบน</option></select></div>
    {!!notice && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}
    {!!error && !target && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-600">{error}</p>}
    {loading ? <p className="rounded-xl bg-white p-8 text-center text-slate-500">กำลังโหลดสมาชิก...</p> : <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-4">สมาชิก</th><th className="p-4">ประเภท</th><th className="p-4">สถานะ / เหตุผล</th><th className="p-4">จัดการ</th></tr></thead><tbody>{visible.map(user=><tr key={user._id} className="border-t border-slate-100"><td className="p-4"><p className="font-semibold text-slate-800">{user.name}</p><p className="text-slate-500">{user.email}</p><p className="text-xs text-slate-400">{user.phone || '-'}</p></td><td className="p-4">{{buyer:'ผู้ซื้อ',seller:'ผู้ขาย',admin:'Admin'}[user.role] || user.role}</td><td className="max-w-xs p-4"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${user.isBanned ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}>{user.isBanned ? 'ถูกแบน' : 'ใช้งานปกติ'}</span>{user.isBanned && <><p className="mt-2 break-words text-slate-500">{user.banReason}</p><p className="mt-1 text-xs text-slate-400">{user.bannedAt ? new Date(user.bannedAt).toLocaleString('th-TH') : ''}</p></>}</td><td className="p-4">{user.role==='admin' ? <span className="text-xs text-slate-400">บัญชีผู้ดูแล</span> : <button disabled={busy} onClick={()=>open(user)} className={`flex items-center gap-2 whitespace-nowrap rounded-lg border px-3 py-2 ${user.isBanned ? 'border-emerald-200 text-emerald-700' : 'border-red-200 text-red-600'}`}>{user.isBanned ? <ShieldCheck size={16}/> : <ShieldBan size={16}/>} {user.isBanned ? 'ปลดแบน' : 'แบนสมาชิก'}</button>}</td></tr>)}{!visible.length && <tr><td colSpan={4} className="p-8 text-center text-slate-500">ไม่พบสมาชิกตามเงื่อนไข</td></tr>}</tbody></table></div>}
    {target && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-5"><form ref={dialogRef} tabIndex={-1} onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="moderation-title" className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6"><h3 id="moderation-title" className="text-lg font-bold">{target.isBanned ? 'ยืนยันปลดแบนสมาชิก' : 'ยืนยันแบนสมาชิก'}</h3><p className="text-sm text-slate-600">{target.name} · {target.email}</p><p className="text-sm text-slate-500">{target.isBanned ? 'สมาชิกจะเข้าสู่ระบบใหม่ได้หลังปลดแบน' : 'บัญชีนี้จะถูกระงับและไม่สามารถใช้ระบบได้ทันที'}</p>{!target.isBanned && <textarea aria-label="เหตุผลการแบน" required maxLength={500} rows={3} value={reason} disabled={busy} onChange={event=>setReason(event.target.value)} placeholder="ระบุเหตุผลการแบน" className={`${input} w-full`}/>} {!!error && <p role="alert" className="text-sm text-red-600">{error}</p>}<div className="flex justify-end gap-3"><button type="button" disabled={busy} onClick={()=>setTarget(null)} className="rounded-xl border px-4 py-2">ยกเลิก</button><button disabled={busy || (!target.isBanned && !reason.trim())} className="rounded-xl bg-[#0F9D8A] px-4 py-2 text-white disabled:opacity-50">{busy ? 'กำลังบันทึก...' : 'ยืนยัน'}</button></div></form></div>}
  </section>;
}