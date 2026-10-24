export const money = value => new Intl.NumberFormat('th-TH',{style:'currency',currency:'THB'}).format((value || 0)/100);
export const dateTime = value => value ? new Intl.DateTimeFormat('th-TH',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Bangkok'}).format(new Date(value)) : "ไม่หมดอายุ";
export const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-xl bg-[#0F9D8A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50';
export const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-[#0F9D8A]';

