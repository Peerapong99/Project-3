
export default function StatCard({
  title,
  value,
  icon: Icon,
  iconColor = "text-teal-600",
  iconBg = "bg-teal-50",
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div
        className={`
          flex h-10 w-10 items-center justify-center
          rounded-lg ${iconBg} ${iconColor}
        `}
      >
        <Icon size={20} />
      </div>

      <h3 className="mt-4 text-2xl font-bold text-slate-900">
        {value}
      </h3>

      <p className="mt-1 text-sm text-slate-500">
        {title}
      </p>
    </div>
  );
}
