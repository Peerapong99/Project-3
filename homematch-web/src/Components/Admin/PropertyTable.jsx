import { useState } from "react";

import {
  ClipboardCheck,
  Eye,
  CheckCircle2,
  XCircle,
  X,
  MapPin,
  House,
  BedDouble,
  Bath,
  Ruler,
  Layers3,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";

import api, {API_ORIGIN} from "../../services/Api";


export default function PropertyTable({
  properties = [],
  dataReady = false,
  onUpdated,
}) {
  const [filter, setFilter] =
    useState("pending");

  const [
    selectedProperty,
    setSelectedProperty,
  ] = useState(null);

  const [
    rejectProperty,
    setRejectProperty,
  ] = useState(null);

  const [
    rejectionReason,
    setRejectionReason,
  ] = useState("");

  const [
    processingId,
    setProcessingId,
  ] = useState(null);

  const [error, setError] =
    useState("");

  const filters = [
    {
      id: "pending",
      label: "รอตรวจสอบ",
    },
    {
      id: "all",
      label: "ทั้งหมด",
    },
  ];

  // =====================================
  // Filter
  // =====================================

  const filteredProperties =
    filter === "all"
      ? properties
      : properties.filter(
          (property) =>
            property.status === "pending"
        );

  // =====================================
  // URL รูป
  // =====================================

  const getImageUrl = (imageUrl) => {
    if (!imageUrl) {
      return "";
    }

    if (
      imageUrl.startsWith("http://") ||
      imageUrl.startsWith("https://")
    ) {
      return imageUrl;
    }

    return `${API_ORIGIN}${imageUrl}`;
  };

  // =====================================
  // ราคา
  // =====================================

  const formatPrice = (price) => {
    return Number(
      price || 0
    ).toLocaleString("th-TH");
  };

  // =====================================
  // ประเภทบ้าน
  // =====================================

  const getTypeName = (type) => {
    const types = {
      house: "บ้านเดี่ยว",
      townhouse: "ทาวน์เฮาส์",
      condo: "คอนโด",
      land: "ที่ดิน",
    };

    return types[type] || type || "-";
  };

  // =====================================
  // Status
  // =====================================

  const getStatusText = (status) => {
    if (status === "pending") {
      return "รอตรวจสอบ";
    }

    if (status === "approved") {
      return "อนุมัติแล้ว";
    }

    if (status === "rejected") {
      return "ปฏิเสธ";
    }

    if (status === "sold") {
      return "ขายแล้ว";
    }

    return status || "-";
  };

  const getStatusClass = (status) => {
    if (status === "approved") {
      return "bg-emerald-50 text-emerald-700";
    }

    if (status === "rejected") {
      return "bg-red-50 text-red-700";
    }

    if (status === "sold") {
      return "bg-blue-50 text-blue-700";
    }

    return "bg-amber-50 text-amber-700";
  };

  // =====================================
  // อนุมัติ
  // =====================================

  const handleApprove = async (
    property
  ) => {
    const confirmed =
      window.confirm(
        `ต้องการอนุมัติประกาศ "${property.title}" หรือไม่?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setProcessingId(property._id);

      await api.patch(
        `/properties/admin/${property._id}/review`,
        {
          status: "approved",
          rejectionReason: "",
        }
      );

      setSelectedProperty(null);

      if (onUpdated) {
        await onUpdated();
      }

      alert("อนุมัติประกาศเรียบร้อย");
    } catch (err) {
      console.error(
        "Approve Property Error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "ไม่สามารถอนุมัติประกาศได้"
      );
    } finally {
      setProcessingId(null);
    }
  };

  // =====================================
  // เปิด Modal ปฏิเสธ
  // =====================================

  const openRejectModal = (
    property
  ) => {
    setError("");
    setRejectionReason("");
    setRejectProperty(property);
  };

  // =====================================
  // ยืนยันปฏิเสธ
  // =====================================

  const handleReject = async () => {
    if (!rejectProperty) {
      return;
    }

    if (!rejectionReason.trim()) {
      setError(
        "กรุณาระบุเหตุผลในการปฏิเสธ"
      );

      return;
    }

    try {
      setError("");

      setProcessingId(
        rejectProperty._id
      );

      await api.patch(
        `/properties/admin/${rejectProperty._id}/review`,
        {
          status: "rejected",

          rejectionReason:
            rejectionReason.trim(),
        }
      );

      setRejectProperty(null);
      setSelectedProperty(null);
      setRejectionReason("");

      if (onUpdated) {
        await onUpdated();
      }

      alert("ปฏิเสธประกาศเรียบร้อย");
    } catch (err) {
      console.error(
        "Reject Property Error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "ไม่สามารถปฏิเสธประกาศได้"
      );
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <>
      {/* =====================================
          Property Table
      ===================================== */}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

        {/* Header */}

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">

          <div className="flex items-center gap-2">
            <ClipboardCheck
              size={19}
              className="text-[#079486]"
            />

            <h2 className="font-semibold text-slate-900">
              จัดการประกาศ
            </h2>
          </div>

          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">

            {filters.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  setFilter(item.id)
                }
                className={`
                  rounded-md px-3 py-2 text-xs font-medium
                  transition
                  ${
                    filter === item.id
                      ? "bg-white text-[#079486] shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }
                `}
              >
                {item.label}
              </button>
            ))}

          </div>

        </div>

        {/* Error */}

        {error && (
          <div className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Data */}

        {!dataReady ? (
          <div className="flex min-h-52 items-center justify-center p-6 text-center text-sm text-slate-400">
            กำลังโหลดข้อมูลประกาศ...
          </div>
        ) : filteredProperties.length ===
          0 ? (
          <div className="flex min-h-52 items-center justify-center p-6 text-center text-sm text-slate-400">

            {filter === "pending"
              ? "ไม่มีประกาศรอตรวจสอบ"
              : "ยังไม่มีประกาศ"}

          </div>
        ) : (
          <div className="overflow-x-auto">

            <table className="w-full text-left text-sm">

              <thead className="bg-slate-50 text-slate-500">

                <tr>

                  <th className="px-5 py-4 font-medium">
                    ชื่อประกาศ
                  </th>

                  <th className="px-5 py-4 font-medium">
                    ผู้ขาย
                  </th>

                  <th className="px-5 py-4 font-medium">
                    สถานะ
                  </th>

                  <th className="px-5 py-4 font-medium">
                    จัดการ
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-slate-100">

                {filteredProperties.map(
                  (property) => (
                    <tr
                      key={property._id}
                      className="hover:bg-slate-50/60"
                    >

                      {/* Property */}

                      <td className="px-5 py-4">

                        <div className="flex min-w-60 items-center gap-3">

                          {property.images?.[0] ? (
                            <img
                              src={getImageUrl(
                                property.images[0]
                              )}
                              alt={
                                property.title
                              }
                              className="h-14 w-20 shrink-0 rounded-lg border border-slate-200 object-cover"
                            />
                          ) : (
                            <div className="flex h-14 w-20 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                              <ImageIcon
                                size={20}
                              />
                            </div>
                          )}

                          <div className="min-w-0">

                            <p className="max-w-64 truncate font-medium text-slate-800">
                              {
                                property.title
                              }
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              ฿
                              {formatPrice(
                                property.price
                              )}
                            </p>

                          </div>

                        </div>

                      </td>

                      {/* Seller */}

                      <td className="px-5 py-4 text-slate-600">
                        {property.seller
                          ?.name ||
                          property.seller
                            ?.email ||
                          "-"}
                      </td>

                      {/* Status */}

                      <td className="px-5 py-4">

                        <span
                          className={`rounded-full px-3 py-1 text-xs ${getStatusClass(
                            property.status
                          )}`}
                        >
                          {getStatusText(
                            property.status
                          )}
                        </span>

                      </td>

                      {/* Actions */}

                      <td className="px-5 py-4">

                        <div className="flex min-w-max items-center gap-2">

                          <button
                            type="button"
                            onClick={() =>
                              setSelectedProperty(
                                property
                              )
                            }
                            className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                          >
                            <Eye size={15} />
                            ดู
                          </button>

                          {property.status ===
                            "pending" && (
                            <>
                              <button
                                type="button"
                                disabled={
                                  processingId ===
                                  property._id
                                }
                                onClick={() =>
                                  handleApprove(
                                    property
                                  )
                                }
                                className="flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                              >
                                <CheckCircle2
                                  size={15}
                                />
                                อนุมัติ
                              </button>

                              <button
                                type="button"
                                disabled={
                                  processingId ===
                                  property._id
                                }
                                onClick={() =>
                                  openRejectModal(
                                    property
                                  )
                                }
                                className="flex items-center gap-1 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
                              >
                                <XCircle
                                  size={15}
                                />
                                ปฏิเสธ
                              </button>
                            </>
                          )}

                        </div>

                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>
        )}

      </section>

      {/* =====================================
          Detail Modal
      ===================================== */}

      {selectedProperty && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() =>
            setSelectedProperty(null)
          }
        >

          <div
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            {/* Modal Header */}

            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">

              <div>
                <h2 className="font-bold text-slate-900">
                  รายละเอียดประกาศ
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  ตรวจสอบข้อมูลก่อนอนุมัติ
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedProperty(
                    null
                  )
                }
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>

            </div>

            <div className="space-y-6 p-5 sm:p-6">

              {/* Property Images */}

              {selectedProperty.images
                ?.length > 0 && (
                <div>

                  <h3 className="mb-3 font-semibold text-slate-800">
                    รูปภาพบ้าน
                  </h3>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">

                    {selectedProperty.images.map(
                      (
                        image,
                        index
                      ) => (
                        <img
                          key={`${image}-${index}`}
                          src={getImageUrl(
                            image
                          )}
                          alt={`Property ${
                            index + 1
                          }`}
                          className="h-40 w-full rounded-xl border border-slate-200 object-cover"
                        />
                      )
                    )}

                  </div>

                </div>
              )}

              {/* Main Detail */}

              <div>

                <div className="flex flex-wrap items-start justify-between gap-3">

                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {
                        selectedProperty.title
                      }
                    </h2>

                    <p className="mt-2 text-2xl font-bold text-[#079486]">
                      ฿
                      {formatPrice(
                        selectedProperty.price
                      )}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs ${getStatusClass(
                      selectedProperty.status
                    )}`}
                  >
                    {getStatusText(
                      selectedProperty.status
                    )}
                  </span>

                </div>

                <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-600">
                  {selectedProperty.description ||
                    "ไม่มีรายละเอียด"}
                </p>

              </div>

              {/* Information */}

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

                <div className="rounded-xl bg-slate-50 p-4">
                  <House
                    size={18}
                    className="text-[#079486]"
                  />

                  <p className="mt-2 text-xs text-slate-400">
                    ประเภท
                  </p>

                  <p className="mt-1 text-sm font-medium">
                    {getTypeName(
                      selectedProperty.type
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <BedDouble
                    size={18}
                    className="text-[#079486]"
                  />

                  <p className="mt-2 text-xs text-slate-400">
                    ห้องนอน
                  </p>

                  <p className="mt-1 text-sm font-medium">
                    {selectedProperty.bedrooms ??
                      0}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <Bath
                    size={18}
                    className="text-[#079486]"
                  />

                  <p className="mt-2 text-xs text-slate-400">
                    ห้องน้ำ
                  </p>

                  <p className="mt-1 text-sm font-medium">
                    {selectedProperty.bathrooms ??
                      0}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <Ruler
                    size={18}
                    className="text-[#079486]"
                  />

                  <p className="mt-2 text-xs text-slate-400">
                    พื้นที่
                  </p>

                  <p className="mt-1 text-sm font-medium">
                    {selectedProperty.area ??
                      0}{" "}
                    ตร.ม.
                  </p>
                </div>

              </div>

              {/* Location */}

              <div className="rounded-xl border border-slate-200 p-4">

                <div className="flex items-center gap-2 font-medium text-slate-800">
                  <MapPin
                    size={18}
                    className="text-[#079486]"
                  />
                  ที่ตั้ง
                </div>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {[
                    selectedProperty
                      .location
                      ?.address,

                    selectedProperty
                      .location
                      ?.district,

                    selectedProperty
                      .location
                      ?.province,
                  ]
                    .filter(Boolean)
                    .join(" ") || "-"}
                </p>

              </div>

              {/* =====================================
                  Floor Plans
              ===================================== */}

              {selectedProperty
                .floorPlans?.length >
                0 && (
                <div>

                  <div className="mb-3 flex items-center gap-2">

                    <Layers3
                      size={19}
                      className="text-[#079486]"
                    />

                    <h3 className="font-semibold text-slate-800">
                      Floor Plan 2D
                    </h3>

                  </div>

                  <div className="space-y-5">

                    {selectedProperty.floorPlans.map(
                      (
                        floorPlan,
                        floorIndex
                      ) => (
                        <div
                          key={
                            floorPlan._id ||
                            floorIndex
                          }
                          className="rounded-xl border border-slate-200 p-4"
                        >

                          <h4 className="mb-3 font-medium text-slate-800">
                            ชั้น{" "}
                            {
                              floorPlan.floor
                            }
                          </h4>

                          {/* Interactive Floor Plan */}

                          <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50">

                            <img
                              src={getImageUrl(
                                floorPlan.imageUrl
                              )}
                              alt={`Floor ${floorPlan.floor}`}
                              className="block w-full object-contain"
                            />

                            {floorPlan.rooms?.map(
                              (
                                room,
                                roomIndex
                              ) => (
                                <div
                                  key={
                                    room._id ||
                                    roomIndex
                                  }
                                  style={{
                                    left: `${room.x}%`,
                                    top: `${room.y}%`,
                                  }}
                                  title={
                                    room.name
                                  }
                                  className="absolute -translate-x-1/2 -translate-y-1/2"
                                >
                                  <div className="flex flex-col items-center">

                                    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#079486] text-white shadow">
                                      <MapPin
                                        size={
                                          16
                                        }
                                      />
                                    </div>

                                    <span className="mt-1 max-w-32 truncate rounded bg-slate-900/80 px-2 py-1 text-[10px] text-white">
                                      {
                                        room.name
                                      }
                                    </span>

                                  </div>
                                </div>
                              )
                            )}

                          </div>

                          {/* Rooms */}

                          {floorPlan.rooms
                            ?.length >
                            0 && (
                            <div className="mt-4 space-y-3">

                              {floorPlan.rooms.map(
                                (
                                  room,
                                  roomIndex
                                ) => (
                                  <div
                                    key={`room-${roomIndex}`}
                                    className="rounded-lg bg-slate-50 p-4"
                                  >

                                    <p className="font-medium text-slate-800">
                                      {
                                        room.name
                                      }
                                    </p>

                                    <p className="mt-1 text-sm text-slate-500">
                                      {room.description ||
                                        "ไม่มีรายละเอียด"}
                                    </p>

                                    {room
                                      .images
                                      ?.length >
                                      0 && (
                                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">

                                        {room.images.map(
                                          (
                                            image,
                                            imageIndex
                                          ) => (
                                            <img
                                              key={`${image}-${imageIndex}`}
                                              src={getImageUrl(
                                                image
                                              )}
                                              alt={`${room.name} ${imageIndex + 1}`}
                                              className="h-24 w-full rounded-lg object-cover"
                                            />
                                          )
                                        )}

                                      </div>
                                    )}

                                  </div>
                                )
                              )}

                            </div>
                          )}

                        </div>
                      )
                    )}

                  </div>

                </div>
              )}

              {/* Rejection Reason */}

              {selectedProperty.status ===
                "rejected" &&
                selectedProperty.rejectionReason && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4">

                    <p className="text-sm font-medium text-red-700">
                      เหตุผลที่ปฏิเสธ
                    </p>

                    <p className="mt-2 text-sm text-red-600">
                      {
                        selectedProperty.rejectionReason
                      }
                    </p>

                  </div>
                )}

              {/* Actions */}

              {selectedProperty.status ===
                "pending" && (
                <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">

                  <button
                    type="button"
                    disabled={
                      processingId ===
                      selectedProperty._id
                    }
                    onClick={() =>
                      openRejectModal(
                        selectedProperty
                      )
                    }
                    className="flex items-center justify-center gap-2 rounded-lg border border-red-200 px-5 py-3 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    <XCircle
                      size={17}
                    />
                    ปฏิเสธ
                  </button>

                  <button
                    type="button"
                    disabled={
                      processingId ===
                      selectedProperty._id
                    }
                    onClick={() =>
                      handleApprove(
                        selectedProperty
                      )
                    }
                    className="flex items-center justify-center gap-2 rounded-lg bg-[#079486] px-5 py-3 text-sm font-medium text-white hover:bg-[#087f74] disabled:opacity-50"
                  >

                    {processingId ===
                    selectedProperty._id ? (
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />
                    ) : (
                      <CheckCircle2
                        size={17}
                      />
                    )}

                    อนุมัติประกาศ

                  </button>

                </div>
              )}

            </div>

          </div>

        </div>
      )}

      {/* =====================================
          Reject Modal
      ===================================== */}

      {rejectProperty && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          onClick={() =>
            setRejectProperty(null)
          }
        >

          <div
            className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl sm:p-6"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="flex items-start justify-between gap-3">

              <div>
                <h2 className="font-bold text-slate-900">
                  ปฏิเสธประกาศ
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {
                    rejectProperty.title
                  }
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setRejectProperty(null)
                }
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>

            </div>

            <div className="mt-5">

              <label className="mb-2 block text-sm font-medium text-slate-700">
                เหตุผลในการปฏิเสธ *
              </label>

              <textarea
                value={rejectionReason}
                onChange={(event) => {
                  setRejectionReason(
                    event.target.value
                  );

                  setError("");
                }}
                rows={5}
                placeholder="เช่น รูปภาพไม่ชัดเจน หรือข้อมูลประกาศไม่ครบถ้วน"
                className="w-full resize-none rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-red-400"
              />

            </div>

            {error && (
              <p className="mt-3 text-sm text-red-600">
                {error}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-3">

              <button
                type="button"
                disabled={
                  processingId ===
                  rejectProperty._id
                }
                onClick={() =>
                  setRejectProperty(null)
                }
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                ยกเลิก
              </button>

              <button
                type="button"
                disabled={
                  processingId ===
                  rejectProperty._id
                }
                onClick={handleReject}
                className="flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
              >

                {processingId ===
                rejectProperty._id ? (
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                ) : (
                  <XCircle
                    size={16}
                  />
                )}

                ยืนยันปฏิเสธ

              </button>

            </div>

          </div>

        </div>
      )}
    </>
  );
}