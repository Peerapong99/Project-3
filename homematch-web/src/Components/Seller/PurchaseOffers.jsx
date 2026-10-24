
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Menu,
  Handshake,
  Clock3,
  CircleCheck,
  CircleX,
  Search,
  RefreshCw,
  House,
  Users,
  LoaderCircle,
  Ban,
} from "lucide-react";

import api, {API_ORIGIN} from "../../services/Api";
import SellerSidebar from "../../Components/Seller/SellerSidebar";

// =====================================
// HELPERS
// =====================================

const formatPrice = (price) => {
  if (price === null || price === undefined) {
    return "-";
  }

  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(price);
};

const formatDate = (date) => {
  if (!date) return "-";

  return new Date(date).toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const getImageUrl = (images) => {
  const image = Array.isArray(images) ? images[0] : null;

  if (typeof image !== "string" || !image) {
    return null;
  }

  if (/^https?:\/\//i.test(image)) {
    return image;
  }

  const path = image.replace(/^\/+/, "");

  return `${API_ORIGIN}/${
    path.startsWith("uploads/") ? path : `uploads/${path}`
  }`;
};

const statusConfig = {
  pending: {
    label: "รอพิจารณา",
    color: "bg-amber-50 text-amber-700 border-amber-200",
  },
  accepted: {
    label: "ยอมรับแล้ว",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  rejected: {
    label: "ปฏิเสธแล้ว",
    color: "bg-red-50 text-red-700 border-red-200",
  },
  cancelled: {
    label: "ยกเลิกแล้ว",
    color: "bg-slate-100 text-slate-600 border-slate-200",
  },
};

// =====================================
// PURCHASE OFFERS
// =====================================

export default function PurchaseOffers() {
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);

  const [offers, setOffers] = useState([]);

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    accepted: 0,
    rejected: 0,
    cancelled: 0,
  });

  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // =====================================
  // LOAD USER
  // =====================================

  useEffect(() => {
    const controller = new AbortController();

    const loadUser = async () => {
      try {
        const response = await api.get("/auth/me", {
          signal: controller.signal,
        });

        if (!controller.signal.aborted) {
          setUser(response.data.user);
        }
      } catch (err) {
        if (controller.signal.aborted) return;

        if (
          err.response?.status === 401 ||
          err.response?.status === 403
        ) {
          navigate("/login", { replace: true });
          return;
        }

        console.error("LOAD USER ERROR:", err);
      }
    };

    loadUser();

    return () => controller.abort();
  }, [navigate]);

  // =====================================
  // LOAD OFFERS
  // =====================================

  const fetchOffers = useCallback(signal => {
    return api.get('/offers/seller', {signal}).then(response => {
      if (signal?.aborted) return;
      setError('');
      setOffers(response.data.offers || []);
      setStats(response.data.stats || {total:0,pending:0,accepted:0,rejected:0,cancelled:0});
    }).catch(error => {
      if (signal?.aborted || error.code === 'ERR_CANCELED') return;
      if (error.response?.status === 401) {navigate('/login', {replace:true}); return;}
      setError(error.response?.data?.message || 'ไม่สามารถโหลดข้อมูลข้อเสนอได้');
    }).finally(() => {if (!signal?.aborted) setLoading(false);});
  }, [navigate]);

  useEffect(() => {
    const controller = new AbortController();

    fetchOffers(controller.signal);

    return () => controller.abort();
  }, [fetchOffers]);

  // =====================================
  // FILTER
  // =====================================

  const filteredOffers = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return offers.filter((offer) => {
      const matchesStatus =
        filter === "all" || offer.status === filter;

      const searchable = [
        offer.property?.title,
        offer.buyer?.name,
        offer.buyer?.email,
        offer.message,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        matchesStatus &&
        searchable.includes(keyword)
      );
    });
  }, [offers, filter, search]);

  // =====================================
  // ACCEPT / REJECT OFFER
  // =====================================

  const handleRespond = async (offer, status) => {
    const action =
      status === "accepted" ? "ยอมรับ" : "ปฏิเสธ";

    const confirmed = window.confirm(
      `ต้องการ${action}ข้อเสนอซื้อบ้าน "${offer.property?.title || "รายการนี้"}" ใช่หรือไม่?`
    );

    if (!confirmed) return;

    try {
      setProcessingId(offer._id);
      setError("");
      setSuccess("");

      await api.patch(
        `/offers/${offer._id}/respond`,
        { status }
      );

      setSuccess(`${action}ข้อเสนอสำเร็จ`);

      await fetchOffers();
    } catch (err) {
      console.error("RESPOND OFFER ERROR:", err);

      setError(
        err.response?.data?.message ||
          "ไม่สามารถจัดการข้อเสนอได้"
      );
    } finally {
      setProcessingId(null);
    }
  };

  // =====================================
  // STATISTICS
  // =====================================

  const summaryCards = [
    {
      title: "ข้อเสนอทั้งหมด",
      value: stats.total,
      icon: Handshake,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      title: "รอพิจารณา",
      value: stats.pending,
      icon: Clock3,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
    },
    {
      title: "ยอมรับแล้ว",
      value: stats.accepted,
      icon: CircleCheck,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      title: "ปฏิเสธแล้ว",
      value: stats.rejected,
      icon: CircleX,
      iconBg: "bg-red-50",
      iconColor: "text-red-600",
    },
  ];

  // =====================================
  // UI
  // =====================================

  return (
    <div className="min-h-screen bg-[#F8FAFC]">

      {/* SIDEBAR */}
      <SellerSidebar
        activeMenu="offers"
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        user={user}
      />

      <div className="min-h-screen lg:ml-64">

        {/* HEADER */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 hover:bg-slate-100 lg:hidden"
              aria-label="เปิดเมนู"
            >
              <Menu size={22} />
            </button>

            <h1 className="text-lg font-bold text-slate-900 sm:text-xl">
              จัดการข้อเสนอซื้อบ้าน
            </h1>
          </div>

          <button
            type="button"
            onClick={() => {setLoading(true); fetchOffers();}}
            disabled={loading || processingId !== null}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={loading ? "animate-spin" : ""}
            />
            <span className="hidden sm:inline">
              รีเฟรช
            </span>
          </button>
        </header>

        {/* MAIN */}
        <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">

          <div>
            <h2 className="text-xl font-bold text-slate-900">
              ข้อเสนอที่ได้รับ
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              ตรวจสอบและตอบรับข้อเสนอจากผู้สนใจซื้อบ้านของคุณ
            </p>
          </div>

          {/* ERROR */}
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {/* SUCCESS */}
          {success && (
            <div
              role="status"
              className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
            >
              {success}
            </div>
          )}

          {/* STATS */}
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {summaryCards.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-slate-500">
                      {item.title}
                    </p>

                    <div
                      className={`rounded-lg p-2.5 ${item.iconBg} ${item.iconColor}`}
                    >
                      <Icon size={20} />
                    </div>
                  </div>

                  <p className="mt-3 text-2xl font-bold text-slate-900">
                    {loading ? "—" : item.value}
                  </p>
                </div>
              );
            })}
          </div>

          {/* SEARCH / FILTER */}
          <div className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row">

            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาชื่อบ้าน ชื่อผู้ซื้อ..."
                className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#079486]"
              />
            </div>

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#079486]"
            >
              <option value="all">ทุกสถานะ</option>
              <option value="pending">รอพิจารณา</option>
              <option value="accepted">ยอมรับแล้ว</option>
              <option value="rejected">ปฏิเสธแล้ว</option>
              <option value="cancelled">ยกเลิกแล้ว</option>
            </select>
          </div>

          {/* LOADING */}
          {loading ? (
            <div className="flex items-center justify-center gap-3 rounded-xl bg-white py-20 text-slate-500">
              <LoaderCircle
                size={24}
                className="animate-spin"
              />
              กำลังโหลดข้อเสนอ...
            </div>
          ) : filteredOffers.length === 0 ? (

            /* EMPTY STATE */
            <div className="rounded-xl border border-slate-100 bg-white px-6 py-16 text-center shadow-sm">
              <Handshake
                size={42}
                className="mx-auto mb-4 text-slate-300"
              />

              <h3 className="text-lg font-semibold text-slate-700">
                ไม่พบรายการข้อเสนอ
              </h3>

              <p className="mt-2 text-sm text-slate-400">
                ยังไม่มีข้อเสนอซื้อบ้าน หรือไม่พบข้อมูลตามที่ค้นหา
              </p>
            </div>

          ) : (

            /* OFFER LIST */
            <div className="space-y-4">
              {filteredOffers.map((offer) => {
                const property = offer.property;
                const buyer = offer.buyer;

                const status =
                  statusConfig[offer.status] ||
                  statusConfig.pending;

                const imageUrl = getImageUrl(
                  property?.images
                );

                return (
                  <div
                    key={offer._id}
                    className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm"
                  >
                    <div className="flex flex-col gap-5 p-5 lg:flex-row">

                      {/* PROPERTY IMAGE */}
                      <div className="flex h-44 w-full shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 lg:w-56">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={property?.title || "บ้าน"}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <House
                            size={44}
                            className="text-slate-300"
                          />
                        )}
                      </div>

                      {/* OFFER DETAIL */}
                      <div className="min-w-0 flex-1">

                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-bold text-slate-900">
                              {property?.title || "ไม่พบข้อมูลประกาศ"}
                            </h3>

                            <p className="mt-1 text-xs text-slate-400">
                              ส่งข้อเสนอเมื่อ {formatDate(offer.createdAt)}
                            </p>
                          </div>

                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold ${status.color}`}
                          >
                            {status.label}
                          </span>
                        </div>

                        {/* PRICES */}
                        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <p className="text-xs text-slate-500">
                              ราคาประกาศ
                            </p>
                            <p className="mt-1 font-semibold text-slate-800">
                              {formatPrice(property?.price)}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-500">
                              ราคาที่เสนอ
                            </p>
                            <p className="mt-1 text-xl font-bold text-[#079486]">
                              {formatPrice(offer.offerPrice)}
                            </p>
                          </div>
                        </div>

                        {/* BUYER */}
                        <div className="mt-5 rounded-xl bg-slate-50 p-4">
                          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                            <Users size={17} />
                            ข้อมูลผู้เสนอซื้อ
                          </div>

                          <p className="text-sm text-slate-700">
                            ชื่อ: {buyer?.name || "-"}
                          </p>

                          <p className="mt-1 text-sm text-slate-600">
                            อีเมล: {buyer?.email || "-"}
                          </p>

                          <p className="mt-1 text-sm text-slate-600">
                            เบอร์โทร: {buyer?.phone || "-"}
                          </p>
                        </div>

                        {/* MESSAGE */}
                        {offer.message && (
                          <div className="mt-4 rounded-xl border border-slate-100 p-4">
                            <p className="mb-1 text-xs font-medium text-slate-500">
                              ข้อความจากผู้ซื้อ
                            </p>

                            <p className="whitespace-pre-wrap text-sm text-slate-700">
                              {offer.message}
                            </p>
                          </div>
                        )}

                        {/* ACTIONS */}
                        {offer.status === "pending" && (
                          <div className="mt-5 flex flex-wrap gap-3">
                            <button
                              type="button"
                              disabled={processingId !== null}
                              onClick={() =>
                                handleRespond(
                                  offer,
                                  "accepted"
                                )
                              }
                              className="flex items-center gap-2 rounded-lg bg-[#079486] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#067c71] disabled:opacity-50"
                            >
                              {processingId === offer._id ? (
                                <LoaderCircle
                                  size={17}
                                  className="animate-spin"
                                />
                              ) : (
                                <CircleCheck size={17} />
                              )}
                              ยอมรับข้อเสนอ
                            </button>

                            <button
                              type="button"
                              disabled={processingId !== null}
                              onClick={() =>
                                handleRespond(
                                  offer,
                                  "rejected"
                                )
                              }
                              className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
                            >
                              <CircleX size={17} />
                              ปฏิเสธข้อเสนอ
                            </button>
                          </div>
                        )}

                        {/* RESPONDED DATE */}
                        {offer.respondedAt && (
                          <p className="mt-4 text-xs text-slate-400">
                            ตอบกลับเมื่อ {formatDate(offer.respondedAt)}
                          </p>
                        )}

                        {offer.status === "cancelled" && (
                          <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                            <Ban size={16} />
                            ผู้ซื้อยกเลิกข้อเสนอนี้แล้ว
                          </p>
                        )}

                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
