
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Plus,
  Pencil,
  Trash2,
  House,
  BadgeDollarSign,
  CircleCheck,
} from "lucide-react";

import api, {API_ORIGIN} from "../../services/Api";


// =====================================
// STATUS
// =====================================

const statusStyles = {
  pending: {
    label: "รอตรวจสอบ",
    className: "bg-amber-100 text-amber-700",
  },
  approved: {
    label: "อนุมัติแล้ว",
    className: "bg-teal-100 text-teal-700",
  },
  rejected: {
    label: "ปฏิเสธ",
    className: "bg-red-100 text-red-700",
  },
  sold: {
    label: "ขายแล้ว",
    className: "bg-slate-200 text-slate-700",
  },
};

// =====================================
// PROPERTY TYPES
// =====================================

const typeLabels = {
  house: "บ้านเดี่ยว",
  townhouse: "ทาวน์เฮ้าส์",
  condo: "คอนโด",
  land: "ที่ดิน",
};

// =====================================
// SELLER PROPERTY TABLE
// =====================================

export default function SellerPropertyTable({
  properties = [],
  loading = false,
  onDeleted,
}) {
  const navigate = useNavigate();

  const [deletingId, setDeletingId] =
    useState(null);

  const [sellingId, setSellingId] =
    useState(null);

  // =====================================
  // FORMAT PRICE
  // =====================================

  const formatPrice = (price) => {
    const value = Number(price);

    if (!Number.isFinite(value)) {
      return "-";
    }

    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      maximumFractionDigits: 0,
    }).format(value);
  };

  // =====================================
  // FORMAT LOCATION
  // =====================================

  const formatLocation = (location) => {
    if (!location) {
      return "-";
    }

    if (typeof location === "string") {
      return location;
    }

    return (
      [
        location.address,
        location.district,
        location.province,
      ]
        .filter(Boolean)
        .join(", ") || "-"
    );
  };

  // =====================================
  // IMAGE URL
  // =====================================

  const getImageUrl = (images) => {
    const image = images?.[0];

    if (!image || typeof image !== "string") {
      return null;
    }

    if (
      image.startsWith("http://") ||
      image.startsWith("https://")
    ) {
      return image;
    }

    return `${API_ORIGIN}${image}`;
  };

  // =====================================
  // REFRESH PROPERTIES
  // =====================================

  const refreshProperties = async () => {
    if (onDeleted) {
      await onDeleted();
    }
  };

  // =====================================
  // DELETE PROPERTY
  // =====================================

  const handleDelete = async (property) => {
    const confirmed = window.confirm(
      `ต้องการลบประกาศ "${property.title}" หรือไม่?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(property._id);

      await api.delete(
        `/properties/${property._id}`
      );

      await refreshProperties();
    } catch (error) {
      console.error(
        "ลบประกาศไม่สำเร็จ:",
        error
      );

      alert(
        error.response?.data?.message ||
          "ไม่สามารถลบประกาศได้"
      );
    } finally {
      setDeletingId(null);
    }
  };

  // =====================================
  // MARK PROPERTY AS SOLD
  // =====================================

  const handleMarkAsSold = async (property) => {
    if (property.status !== "approved") {
      alert(
        "สามารถปิดการขายได้เฉพาะประกาศที่อนุมัติแล้วเท่านั้น"
      );
      return;
    }

    const confirmed = window.confirm(
      `ยืนยันว่าประกาศ "${property.title}" ขายแล้วหรือไม่?\n\nหลังจากปิดการขาย ประกาศนี้จะไม่แสดงให้ผู้ซื้อเห็นอีก`
    );

    if (!confirmed) {
      return;
    }

    try {
      setSellingId(property._id);

      const response = await api.patch(
        `/properties/${property._id}/sold`
      );

      alert(
        response.data?.message ||
          "ปิดการขายเรียบร้อยแล้ว"
      );

      await refreshProperties();
    } catch (error) {
      console.error(
        "ปิดการขายไม่สำเร็จ:",
        error
      );

      alert(
        error.response?.data?.message ||
          "ไม่สามารถปิดการขายได้"
      );
    } finally {
      setSellingId(null);
    }
  };

  // =====================================
  // EDIT PROPERTY
  // =====================================

  const handleEditProperty = (property) => {
    if (property.status === "sold") {
      alert(
        "ประกาศที่ขายแล้วไม่สามารถแก้ไขได้"
      );
      return;
    }

    navigate(
      `/seller/edit-property/${property._id}`
    );
  };

  // =====================================
  // UI
  // =====================================

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">

        <h2 className="text-base font-semibold text-slate-900">
          ประกาศของฉัน
        </h2>

        <button
          type="button"
          onClick={() =>
            navigate("/seller/add-property")
          }
          className="flex items-center gap-2 rounded-lg bg-[#079486] px-4 py-2 text-sm font-medium text-white hover:bg-[#087f74]"
        >
          <Plus size={17} />
          เพิ่มประกาศใหม่
        </button>

      </div>

      {/* LOADING */}
      {loading ? (
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-6 text-center">
          <House
            size={36}
            className="text-slate-300"
          />

          <p className="text-sm text-slate-500">
            กำลังโหลดข้อมูลประกาศ...
          </p>
        </div>
      ) : properties.length === 0 ? (

        /* EMPTY */
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-6 text-center">

          <House
            size={36}
            className="text-slate-300"
          />

          <p className="text-sm text-slate-500">
            คุณยังไม่มีประกาศขายบ้าน
          </p>

          <button
            type="button"
            onClick={() =>
              navigate("/seller/add-property")
            }
            className="text-sm font-medium text-[#079486] hover:underline"
          >
            เริ่มสร้างประกาศแรก
          </button>

        </div>
      ) : (

        /* PROPERTY TABLE */
        <div className="overflow-x-auto">

          <table className="w-full min-w-[900px] text-left text-sm">

            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-4 font-medium">
                  ประกาศ
                </th>

                <th className="px-5 py-4 font-medium">
                  ประเภท
                </th>

                <th className="px-5 py-4 font-medium">
                  ราคา
                </th>

                <th className="px-5 py-4 font-medium">
                  สถานะ
                </th>

                <th className="px-5 py-4 text-center font-medium">
                  จัดการ
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">

              {properties.map((property) => {
                const status =
                  statusStyles[property.status] || {
                    label:
                      property.status || "-",
                    className:
                      "bg-slate-100 text-slate-600",
                  };

                const imageUrl =
                  getImageUrl(property.images);

                const isApproved =
                  property.status === "approved";

                const isSold =
                  property.status === "sold";

                const isSelling =
                  sellingId === property._id;

                const isDeleting =
                  deletingId === property._id;

                const isBusy =
                  isSelling || isDeleting;

                return (
                  <tr
                    key={property._id}
                    className="hover:bg-slate-50"
                  >

                    {/* PROPERTY */}
                    <td className="px-5 py-4">

                      <div className="flex min-w-52 items-center gap-3">

                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={property.title}
                            className="h-16 w-20 shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-16 w-20 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                            <House
                              size={24}
                              className="text-slate-400"
                            />
                          </div>
                        )}

                        <div>
                          <p className="font-medium text-slate-900">
                            {property.title}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {formatLocation(
                              property.location
                            )}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            แปลน 2D:{" "}
                            {property.floorPlans
                              ?.length || 0}{" "}
                            ชั้น
                          </p>
                        </div>

                      </div>
                    </td>

                    {/* TYPE */}
                    <td className="px-5 py-4 text-slate-600">
                      {typeLabels[property.type] ||
                        property.type ||
                        "-"}
                    </td>

                    {/* PRICE */}
                    <td className="px-5 py-4 font-medium text-[#079486]">
                      {formatPrice(property.price)}
                    </td>

                    {/* STATUS */}
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </td>

                    {/* ACTIONS */}
                    <td className="px-5 py-4">

                      <div className="flex items-center justify-center gap-2">

                        {/* MARK AS SOLD */}
                        {isApproved && (
                          <button
                            type="button"
                            onClick={() =>
                              handleMarkAsSold(property)
                            }
                            disabled={isBusy}
                            title="ปิดการขาย"
                            className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <BadgeDollarSign
                              size={16}
                            />

                            {isSelling
                              ? "กำลังปิด..."
                              : "ปิดการขาย"}
                          </button>
                        )}

                        {/* SOLD */}
                        {isSold && (
                          <div className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600">
                            <CircleCheck size={16} />
                            ขายแล้ว
                          </div>
                        )}

                        {/* EDIT ALL DETAILS */}
                        <button
                          type="button"
                          onClick={() =>
                            handleEditProperty(property)
                          }
                          disabled={isSold || isBusy}
                          title={
                            isSold
                              ? "ประกาศที่ขายแล้วไม่สามารถแก้ไขได้"
                              : "แก้ไขรายละเอียดประกาศ"
                          }
                          aria-label={`แก้ไขประกาศ ${property.title}`}
                          className="rounded-lg p-2 text-teal-600 transition hover:bg-teal-50 hover:text-teal-800 disabled:cursor-not-allowed disabled:text-slate-300"
                        >
                          <Pencil size={17} />
                        </button>

                        {/* DELETE */}
                        <button
                          type="button"
                          onClick={() =>
                            handleDelete(property)
                          }
                          disabled={isBusy}
                          title="ลบประกาศ"
                          className="rounded-lg p-2 text-red-500 transition hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Trash2 size={17} />
                        </button>

                      </div>
                    </td>

                  </tr>
                );
              })}

            </tbody>
          </table>
        </div>
      )}

    </section>
  );
}
