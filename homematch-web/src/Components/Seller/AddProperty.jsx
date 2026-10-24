import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Menu,
  House,
  Upload,
  Image,
  X,
  MapPin,
  BedDouble,
  Bath,
  Ruler,
  Layers3,
  Loader2,
  ExternalLink,
} from "lucide-react";

import api from "../../services/Api";
import SellerSidebar from "../../Components/Seller/SellerSidebar";
import FloorPlanEditor from "../../Components/Seller/FloorPlanEditor";

import useResource from '../../services/useSubscriptionResource';
export default function AddProperty() {
  const quota = useResource('/subscriptions/usage');
  const imageLimit = quota.data?.imageLimit || 5;
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const user = JSON.parse(
    sessionStorage.getItem("user") || "null"
  );

  // =====================================
  // ข้อมูลประกาศ
  // =====================================

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "house",
    price: "",
    address: "",
    district: "",
    province: "",
    googleMapsUrl: "",
    latitude: "",
    longitude: "",
    bedrooms: "",
    bathrooms: "",
    area: "",
  });

  // =====================================
  // รูปภาพบ้าน
  // =====================================

  const [propertyImages, setPropertyImages] = useState([]);
  const [propertyPreviews, setPropertyPreviews] = useState([]);

  // =====================================
  // Floor Plans
  // =====================================

  const [floorPlans, setFloorPlans] = useState([
    {
      floor: 1,
      file: null,
      preview: null,
      rooms: [],
    },
  ]);

  // =====================================
  // สถานะ
  // =====================================

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // =====================================
  // Input Handler
  // =====================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // =====================================
  // GOOGLE MAPS HELPERS
  // =====================================

  const latitude =
    formData.latitude.trim() === ""
      ? null
      : Number(formData.latitude);

  const longitude =
    formData.longitude.trim() === ""
      ? null
      : Number(formData.longitude);

  const hasValidCoordinates =
    latitude !== null &&
    longitude !== null &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;

  const mapPreviewUrl = hasValidCoordinates
    ? `https://maps.google.com/maps?q=${encodeURIComponent(
        `${latitude},${longitude}`
      )}&z=16&output=embed`
    : "";

  const googleMapsLink = hasValidCoordinates
    ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
    : formData.googleMapsUrl.trim();

  const isValidGoogleMapsUrl = (value) => {
    if (!value) return true;

    try {
      const url = new URL(value);

      const allowedHosts = [
        "google.com",
        "www.google.com",
        "google.co.th",
        "www.google.co.th",
        "maps.google.com",
        "maps.app.goo.gl",
        "goo.gl",
      ];

      return (
        url.protocol === "https:" &&
        allowedHosts.includes(url.hostname.toLowerCase())
      );
    } catch {
      return false;
    }
  };

  // =====================================
  // เลือกรูปบ้าน
  // =====================================

  const handlePropertyImages = (event) => {
    const files = Array.from(event.target.files || []);

    if (files.length === 0) return;

    const totalImages = [
      ...propertyImages,
      ...files,
    ].slice(0, imageLimit);

    propertyPreviews.forEach((url) => {
      URL.revokeObjectURL(url);
    });

    setPropertyImages(totalImages);

    setPropertyPreviews(
      totalImages.map((file) =>
        URL.createObjectURL(file)
      )
    );

    event.target.value = "";
  };

  // =====================================
  // ลบรูปบ้าน
  // =====================================

  const removePropertyImage = (index) => {
    const newImages = propertyImages.filter(
      (_, imageIndex) => imageIndex !== index
    );

    if (propertyPreviews[index]) {
      URL.revokeObjectURL(propertyPreviews[index]);
    }

    const newPreviews = propertyPreviews.filter(
      (_, imageIndex) => imageIndex !== index
    );

    setPropertyImages(newImages);
    setPropertyPreviews(newPreviews);
  };

  // =====================================
  // เพิ่มชั้น
  // =====================================

  const addFloor = () => {
    if (floorPlans.length >= 5) {
      setError("เพิ่มแปลนบ้านได้สูงสุด 5 ชั้น");
      return;
    }

    setError("");

    setFloorPlans((previous) => [
      ...previous,
      {
        floor: previous.length + 1,
        file: null,
        preview: null,
        rooms: [],
      },
    ]);
  };

  // =====================================
  // เลือกรูป Floor Plan
  // =====================================

  const handleFloorPlanChange = (index, event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setFloorPlans((previous) =>
      previous.map((floorPlan, floorIndex) => {
        if (floorIndex !== index) {
          return floorPlan;
        }

        if (floorPlan.preview) {
          URL.revokeObjectURL(floorPlan.preview);
        }

        return {
          ...floorPlan,
          file,
          preview: URL.createObjectURL(file),
        };
      })
    );

    event.target.value = "";
  };

  // =====================================
  // ลบชั้น
  // =====================================

  const removeFloor = (index) => {
    setFloorPlans((previous) => {
      const floorToRemove = previous[index];

      if (floorToRemove?.preview) {
        URL.revokeObjectURL(floorToRemove.preview);
      }

      return previous
        .filter(
          (_, floorIndex) => floorIndex !== index
        )
        .map((floorPlan, floorIndex) => ({
          ...floorPlan,
          floor: floorIndex + 1,
        }));
    });
  };

  // =====================================
  // อัปเดตห้องแต่ละชั้น
  // =====================================

  const handleRoomsChange = (floorIndex, rooms) => {
    setFloorPlans((previous) =>
      previous.map((floorPlan, index) =>
        index === floorIndex
          ? {
              ...floorPlan,
              rooms,
            }
          : floorPlan
      )
    );
  };

  // =====================================
  // SUBMIT
  // =====================================

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if(!quota.data || !quota.data.canCreate) {setError(quota.error || "ใช้โควตาครบแล้ว กรุณาอัปเกรดแพ็กเกจ");return;}
    if(propertyImages.length>imageLimit) {setError("จำนวนรูปเกินสิทธิ์แพ็กเกจ");return;}

    // ตรวจสอบข้อมูลทั่วไป
    if (!formData.title.trim()) {
      setError("กรุณากรอกชื่อประกาศ");
      return;
    }

    if (!formData.description.trim()) {
      setError("กรุณากรอกรายละเอียดบ้าน");
      return;
    }

    if (
      !formData.price ||
      !Number.isFinite(Number(formData.price)) ||
      Number(formData.price) <= 0
    ) {
      setError("กรุณากรอกราคาที่มากกว่า 0 บาท");
      return;
    }

    if (
      !formData.address.trim() ||
      !formData.district.trim() ||
      !formData.province.trim()
    ) {
      setError("กรุณากรอกที่อยู่ อำเภอ และจังหวัดให้ครบ");
      return;
    }

    if (
      !formData.area ||
      !Number.isFinite(Number(formData.area)) ||
      Number(formData.area) < 0
    ) {
      setError("กรุณากรอกพื้นที่ให้ถูกต้อง");
      return;
    }

    // ตรวจสอบ Google Maps
    if (
      !isValidGoogleMapsUrl(
        formData.googleMapsUrl.trim()
      )
    ) {
      setError(
        "กรุณาใส่ลิงก์ Google Maps ที่ถูกต้อง"
      );
      return;
    }

    const hasLatitude =
      formData.latitude.trim() !== "";

    const hasLongitude =
      formData.longitude.trim() !== "";

    if (hasLatitude !== hasLongitude) {
      setError(
        "กรุณากรอก Latitude และ Longitude ให้ครบทั้งสองช่อง"
      );
      return;
    }

    if (
      (hasLatitude || hasLongitude) &&
      !hasValidCoordinates
    ) {
      setError(
        "พิกัดไม่ถูกต้อง Latitude ต้องอยู่ระหว่าง -90 ถึง 90 และ Longitude ระหว่าง -180 ถึง 180"
      );
      return;
    }

    if (propertyImages.length === 0) {
      setError(
        "กรุณาเลือกรูปภาพบ้านอย่างน้อย 1 รูป"
      );
      return;
    }

    // เอาเฉพาะชั้นที่มี Floor Plan
    const floorPlansWithFiles = floorPlans.filter(
      (floorPlan) => floorPlan.file
    );

    if (floorPlansWithFiles.length === 0) {
      setError(
        "กรุณาอัปโหลด Floor Plan อย่างน้อย 1 ชั้น"
      );
      return;
    }

    // ตรวจสอบห้อง
    const floorWithoutRooms = floorPlansWithFiles.find(
      (floorPlan) =>
        !floorPlan.rooms ||
        floorPlan.rooms.length === 0
    );

    if (floorWithoutRooms) {
      setError(
        `กรุณากำหนดตำแหน่งห้องอย่างน้อย 1 ห้องในชั้น ${floorWithoutRooms.floor}`
      );
      return;
    }

    for (const floorPlan of floorPlansWithFiles) {
      for (const room of floorPlan.rooms) {
        if (!room.name?.trim()) {
          setError(
            `พบห้องที่ยังไม่ได้ระบุชื่อในชั้น ${floorPlan.floor}`
          );
          return;
        }

        if (
          !Number.isFinite(Number(room.x)) ||
          !Number.isFinite(Number(room.y)) ||
          Number(room.x) < 0 ||
          Number(room.x) > 100 ||
          Number(room.y) < 0 ||
          Number(room.y) > 100
        ) {
          setError(
            `ตำแหน่งของห้อง "${room.name}" ไม่ถูกต้อง`
          );
          return;
        }
      }
    }

    try {
      setSubmitting(true);

      // =====================================
      // STEP 1: Upload รูปบ้าน + Floor Plan
      // =====================================

      const propertyUploadData = new FormData();

      propertyImages.forEach((file) => {
        propertyUploadData.append("images", file);
      });

      floorPlansWithFiles.forEach((floorPlan) => {
        propertyUploadData.append(
          "floorPlans",
          floorPlan.file
        );
      });

      const propertyUploadResponse = await api.post(
        "/uploads",
        propertyUploadData
      );

      const uploadedPropertyImages =
        propertyUploadResponse.data.images || [];

      const uploadedFloorPlans =
        propertyUploadResponse.data.floorPlans || [];

      if (
        uploadedPropertyImages.length !==
        propertyImages.length
      ) {
        throw new Error(
          "อัปโหลดรูปภาพบ้านไม่ครบ กรุณาลองใหม่"
        );
      }

      if (
        uploadedFloorPlans.length !==
        floorPlansWithFiles.length
      ) {
        throw new Error(
          "อัปโหลด Floor Plan ไม่ครบ กรุณาลองใหม่"
        );
      }

      // =====================================
      // STEP 2: สร้าง Floor Plan Data
      // =====================================

      const floorPlanData = [];

      for (
        let floorIndex = 0;
        floorIndex < floorPlansWithFiles.length;
        floorIndex++
      ) {
        const floorPlan =
          floorPlansWithFiles[floorIndex];

        const roomsData = [];

        for (
          let roomIndex = 0;
          roomIndex < floorPlan.rooms.length;
          roomIndex++
        ) {
          const room =
            floorPlan.rooms[roomIndex];

          let roomImageUrls = Array.isArray(
            room.images
          )
            ? [...room.images]
            : [];

          const roomImageFiles = Array.isArray(
            room.imageFiles
          )
            ? room.imageFiles
            : [];

          // Upload รูปห้อง
          if (roomImageFiles.length > 0) {
            const roomUploadData = new FormData();

            roomImageFiles.forEach((file) => {
              roomUploadData.append(
                "images",
                file
              );
            });

            const roomUploadResponse =
              await api.post(
                "/uploads",
                roomUploadData
              );

            const newRoomImages =
              roomUploadResponse.data.images || [];

            if (
              newRoomImages.length !==
              roomImageFiles.length
            ) {
              throw new Error(
                `อัปโหลดรูปของห้อง "${room.name}" ไม่ครบ`
              );
            }

            roomImageUrls = [
              ...roomImageUrls,
              ...newRoomImages,
            ];
          }

          roomsData.push({
            name: room.name.trim(),
            description:
              room.description?.trim() || "",
            x: Number(room.x),
            y: Number(room.y),
            images: roomImageUrls,
          });
        }

        floorPlanData.push({
          floor: floorPlan.floor,
          imageUrl:
            uploadedFloorPlans[floorIndex],
          rooms: roomsData,
        });
      }

      // =====================================
      // STEP 3: Property Data + Google Maps
      // =====================================

      const propertyData = {
        title: formData.title.trim(),
        description:
          formData.description.trim(),
        type: formData.type,
        price: Number(formData.price),

        location: {
          address: formData.address.trim(),
          district: formData.district.trim(),
          province: formData.province.trim(),

          googleMapsUrl:
            formData.googleMapsUrl.trim(),

          latitude: hasValidCoordinates
            ? latitude
            : null,

          longitude: hasValidCoordinates
            ? longitude
            : null,
        },

        bedrooms:
          Number(formData.bedrooms) || 0,

        bathrooms:
          Number(formData.bathrooms) || 0,

        area: Number(formData.area),

        images: uploadedPropertyImages,

        floorPlans: floorPlanData,
      };

      console.log(
        "PROPERTY DATA:",
        propertyData
      );

      // =====================================
      // STEP 4: บันทึกลง MongoDB
      // =====================================

      await api.post(
        "/properties",
        propertyData
      );

      alert(
        "เพิ่มประกาศสำเร็จ รอผู้ดูแลระบบตรวจสอบ"
      );

      navigate("/seller/dashboard", {
        replace: true,
      });
    } catch (err) {
      console.error(
        "เพิ่มประกาศไม่สำเร็จ:",
        err
      );

      if (err.response?.status === 413) {
        setError(
          "ไฟล์รูปภาพมีขนาดใหญ่เกินไป กรุณาลดขนาดรูปแล้วลองใหม่"
        );
        return;
      }

      setError(
        err.response?.data?.message ||
          err.message ||
          "ไม่สามารถเพิ่มประกาศได้ กรุณาลองใหม่อีกครั้ง"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // =====================================
  // INPUT CLASS
  // =====================================

  const inputClass =
    "w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-[#079486]";

  // =====================================
  // UI
  // =====================================

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <SellerSidebar
        activeMenu="add"
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        user={user}
      />

      <div className="min-h-screen lg:ml-64">
        {/* HEADER */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden"
            aria-label="เปิดเมนู"
          >
            <Menu size={22} />
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/seller/dashboard")
            }
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-[#079486]"
          >
            <ArrowLeft size={18} />
            กลับ
          </button>

          <h1 className="ml-3 text-lg font-bold text-slate-900">
            เพิ่มประกาศใหม่
          </h1>
        </header>

        <main className="mx-auto max-w-4xl p-4 sm:p-6">
          <section className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-teal-200 bg-white p-4 text-sm">
            <div>{quota.loading?"กำลังตรวจโควตา...":quota.error || ("ประกาศ "+quota.data?.used+'/'+quota.data?.listingLimit+" หลัง · เหลือ "+quota.data?.remaining+" หลัง")}<p className="mt-1 text-slate-500">รูปภาพสูงสุด  {imageLimit}  รูปต่อประกาศ</p></div>
            {quota.error?<button type="button" onClick={quota.reload} className="text-[#0F9D8A] underline">ตรวจใหม่</button>:<Link to="/seller/subscription/plans" className="rounded-lg bg-[#0F9D8A] px-4 py-2 font-medium text-white">อัปเกรดแพ็กเกจ</Link>}
          </section>
          <form
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            {/* ===========================
                ข้อมูลประกาศ
            =========================== */}

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-lg bg-teal-50 p-2 text-[#079486]">
                  <House size={22} />
                </div>

                <div>
                  <h2 className="font-semibold text-slate-900">
                    ข้อมูลประกาศ
                  </h2>

                  <p className="text-sm text-slate-500">
                    กรอกรายละเอียดบ้านที่ต้องการขาย
                  </p>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="property-title" className="mb-2 block text-sm font-medium text-slate-700">
                    ชื่อประกาศ *
                  </label>

                  <input id="property-title"
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="เช่น บ้านเดี่ยว 2 ชั้น ใกล้ BTS"
                    required
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="property-type" className="mb-2 block text-sm font-medium text-slate-700">
                    ประเภทอสังหาริมทรัพย์ *
                  </label>

                  <select id="property-type"
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <option value="house">
                      บ้านเดี่ยว
                    </option>

                    <option value="townhouse">
                      ทาวน์เฮาส์
                    </option>

                    <option value="condo">
                      คอนโด
                    </option>

                    <option value="land">
                      ที่ดิน
                    </option>
                  </select>
                </div>

                <div>
                  <label htmlFor="property-price" className="mb-2 block text-sm font-medium text-slate-700">
                    ราคา (บาท) *
                  </label>

                  <input id="property-price"
                    type="number"
                    name="price"
                    min="0.01"
                    step="any"
                    value={formData.price}
                    onChange={handleChange}
                    placeholder="3500000"
                    required
                    className={inputClass}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="property-description" className="mb-2 block text-sm font-medium text-slate-700">
                    รายละเอียด *
                  </label>

                  <textarea id="property-description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={5}
                    required
                    placeholder="รายละเอียดเกี่ยวกับบ้าน ทำเล สิ่งอำนวยความสะดวก..."
                    className={`${inputClass} resize-none`}
                  />
                </div>
              </div>
            </section>

            {/* ===========================
                รายละเอียดบ้าน
            =========================== */}

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="mb-5 font-semibold text-slate-900">
                รายละเอียดบ้าน
              </h2>

              <div className="grid gap-5 sm:grid-cols-3">
                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                    <BedDouble size={17} />
                    ห้องนอน
                  </label>

                  <input
                    type="number"
                    min="0"
                    name="bedrooms"
                    value={formData.bedrooms}
                    onChange={handleChange}
                    placeholder="3"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Bath size={17} />
                    ห้องน้ำ
                  </label>

                  <input
                    type="number"
                    min="0"
                    name="bathrooms"
                    value={formData.bathrooms}
                    onChange={handleChange}
                    placeholder="2"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Ruler size={17} />
                    พื้นที่ (ตร.ม.) *
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="any"
                    name="area"
                    value={formData.area}
                    onChange={handleChange}
                    placeholder="180"
                    required
                    className={inputClass}
                  />
                </div>
              </div>
            </section>

            {/* ===========================
                ที่ตั้ง + GOOGLE MAPS
            =========================== */}

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-center gap-2">
                <MapPin
                  size={20}
                  className="text-[#079486]"
                />

                <h2 className="font-semibold text-slate-900">
                  ที่ตั้งและ Google Maps
                </h2>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="property-address" className="mb-2 block text-sm font-medium text-slate-700">
                    ที่อยู่ *
                  </label>

                  <input id="property-address"
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="บ้านเลขที่ ถนน ซอย"
                    required
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="property-district" className="mb-2 block text-sm font-medium text-slate-700">
                    เขต / อำเภอ *
                  </label>

                  <input id="property-district"
                    type="text"
                    name="district"
                    value={formData.district}
                    onChange={handleChange}
                    placeholder="เช่น คลองเตย"
                    required
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="property-province" className="mb-2 block text-sm font-medium text-slate-700">
                    จังหวัด *
                  </label>

                  <input id="property-province"
                    type="text"
                    name="province"
                    value={formData.province}
                    onChange={handleChange}
                    placeholder="เช่น กรุงเทพมหานคร"
                    required
                    className={inputClass}
                  />
                </div>

                {/* GOOGLE MAPS */}
                <div className="sm:col-span-2 border-t border-slate-200 pt-6">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="rounded-lg bg-teal-50 p-2">
                      <MapPin
                        size={22}
                        className="text-[#079486]"
                      />
                    </div>

                    <div>
                      <h3 className="font-semibold text-slate-900">
                        ตำแหน่งบ้านบน Google Maps
                      </h3>

                      <p className="text-sm text-slate-500">
                        เพิ่มตำแหน่งเพื่อให้ผู้ซื้อเปิดแผนที่และนำทางได้
                      </p>
                    </div>
                  </div>

                  <label htmlFor="property-googleMapsUrl" className="mb-2 block text-sm font-medium text-slate-700">
                    ลิงก์ Google Maps
                  </label>

                  <input id="property-googleMapsUrl"
                    type="url"
                    name="googleMapsUrl"
                    value={formData.googleMapsUrl}
                    onChange={handleChange}
                    placeholder="https://maps.app.goo.gl/..."
                    className={inputClass}
                  />

                  <p className="mt-2 text-xs text-slate-500">
                    เปิด Google Maps เลือกตำแหน่งบ้าน
                    กดแชร์ แล้วคัดลอกลิงก์มาวาง
                  </p>
                </div>

                <div>
                  <label htmlFor="property-latitude" className="mb-2 block text-sm font-medium text-slate-700">
                    Latitude (ละติจูด)
                  </label>

                  <input id="property-latitude"
                    type="number"
                    name="latitude"
                    step="any"
                    min="-90"
                    max="90"
                    value={formData.latitude}
                    onChange={handleChange}
                    placeholder="13.987"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="property-longitude" className="mb-2 block text-sm font-medium text-slate-700">
                    Longitude (ลองจิจูด)
                  </label>

                  <input id="property-longitude"
                    type="number"
                    name="longitude"
                    step="any"
                    min="-180"
                    max="180"
                    value={formData.longitude}
                    onChange={handleChange}
                    placeholder="100.618"
                    className={inputClass}
                  />
                </div>

                {hasValidCoordinates && (
                  <div className="sm:col-span-2">
                    <p className="mb-3 text-sm font-medium text-slate-700">
                      ตัวอย่างตำแหน่งบ้าน
                    </p>

                    <iframe
                      title="ตำแหน่งบ้านบน Google Maps"
                      src={mapPreviewUrl}
                      className="h-72 w-full rounded-xl border border-slate-200"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                )}

                {googleMapsLink &&
                  (hasValidCoordinates ||
                    isValidGoogleMapsUrl(
                      googleMapsLink
                    )) && (
                    <div className="sm:col-span-2">
                      <a
                        href={googleMapsLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg bg-[#079486] px-5 py-3 text-sm font-medium text-white hover:bg-[#087f74]"
                      >
                        <ExternalLink size={18} />
                        เปิดตำแหน่งใน Google Maps
                      </a>
                    </div>
                  )}

                <div className="sm:col-span-2 rounded-lg bg-teal-50 p-4 text-sm leading-6 text-teal-700">
                  หากต้องการแสดงแผนที่พร้อมหมุดในแอป
                  กรุณากรอก Latitude และ Longitude ให้ครบ
                  ลิงก์ Google Maps อย่างเดียวจะใช้สำหรับเปิดแผนที่ภายนอก
                </div>
              </div>
            </section>

            {/* ===========================
                รูปภาพบ้าน
            =========================== */}

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <Image
                  size={21}
                  className="text-[#079486]"
                />

                <div>
                  <h2 className="font-semibold text-slate-900">
                    รูปภาพบ้าน
                  </h2>

                  <p className="text-sm text-slate-500">
                    สูงสุด {imageLimit} รูป
                  </p>
                </div>
              </div>

              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 p-8 transition hover:border-[#079486] hover:bg-teal-50/30">
                <Upload
                  size={30}
                  className="text-[#079486]"
                />

                <span className="mt-3 text-sm font-medium text-slate-700">
                  คลิกเพื่อเลือกรูปภาพ
                </span>

                <span className="mt-1 text-xs text-slate-400">
                  JPG, PNG หรือ WEBP
                </span>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handlePropertyImages}
                  className="hidden"
                />
              </label>

              {propertyPreviews.length > 0 && (
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {propertyPreviews.map(
                    (preview, index) => (
                      <div
                        key={preview}
                        className="group relative overflow-hidden rounded-lg border border-slate-200"
                      >
                        <img
                          src={preview}
                          alt={`Property ${index + 1}`}
                          className="h-32 w-full object-cover"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            removePropertyImage(index)
                          }
                          className="absolute right-2 top-2 rounded-full bg-white p-1.5 text-red-500 shadow hover:bg-red-50"
                        >
                          <X size={16} />
                        </button>

                        {index === 0 && (
                          <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1 text-xs text-white">
                            รูปหน้าปก
                          </span>
                        )}
                      </div>
                    )
                  )}
                </div>
              )}
            </section>

            {/* ===========================
                FLOOR PLAN 2D
            =========================== */}

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Layers3
                    size={22}
                    className="text-[#079486]"
                  />

                  <div>
                    <h2 className="font-semibold text-slate-900">
                      แปลนบ้าน 2D
                    </h2>

                    <p className="text-sm text-slate-500">
                      อัปโหลดแปลนแยกแต่ละชั้น
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={addFloor}
                  disabled={floorPlans.length >= 5}
                  className="rounded-lg border border-[#079486] px-3 py-2 text-sm font-medium text-[#079486] hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  + เพิ่มชั้น
                </button>
              </div>

              <div className="space-y-6">
                {floorPlans.map(
                  (floorPlan, index) => (
                    <div
                      key={index}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-slate-800">
                            ชั้น {floorPlan.floor}
                          </h3>

                          {floorPlan.rooms.length > 0 && (
                            <p className="mt-1 text-xs text-slate-400">
                              กำหนดแล้ว{" "}
                              {floorPlan.rooms.length} ห้อง
                            </p>
                          )}
                        </div>

                        {floorPlans.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              removeFloor(index)
                            }
                            className="text-sm text-red-500 hover:text-red-600"
                          >
                            ลบชั้น
                          </button>
                        )}
                      </div>

                      {!floorPlan.preview ? (
                        <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 p-7 transition hover:border-[#079486] hover:bg-teal-50/30">
                          <Upload
                            size={26}
                            className="text-[#079486]"
                          />

                          <span className="mt-2 text-sm font-medium text-slate-600">
                            เลือกรูป Floor Plan
                          </span>

                          <span className="mt-1 text-xs text-slate-400">
                            JPG, PNG หรือ WEBP
                          </span>

                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(event) =>
                              handleFloorPlanChange(
                                index,
                                event
                              )
                            }
                            className="hidden"
                          />
                        </label>
                      ) : (
                        <>
                          <div className="relative">
                            <img
                              src={floorPlan.preview}
                              alt={`Floor ${floorPlan.floor}`}
                              className="max-h-96 w-full rounded-lg border border-slate-200 object-contain"
                            />

                            <label className="absolute right-3 top-3 cursor-pointer rounded-lg bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow hover:bg-slate-50">
                              เปลี่ยนรูป

                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={(event) =>
                                  handleFloorPlanChange(
                                    index,
                                    event
                                  )
                                }
                                className="hidden"
                              />
                            </label>
                          </div>

                          <div className="mt-5">
                            <FloorPlanEditor
                              imageUrl={floorPlan.preview}
                              rooms={
                                floorPlan.rooms || []
                              }
                              onChange={(rooms) =>
                                handleRoomsChange(
                                  index,
                                  rooms
                                )
                              }
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )
                )}
              </div>

              <div className="mt-4 rounded-lg bg-teal-50 p-4 text-sm leading-6 text-teal-700">
                อัปโหลด Floor Plan แล้วคลิกตำแหน่งบนแปลน
                เพื่อกำหนดห้อง เช่น ห้องนอน ห้องน้ำ
                ห้องครัว และห้องนั่งเล่น
              </div>
            </section>

            {/* ===========================
                ERROR
            =========================== */}

            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600"
              >
                {error}
              </div>
            )}

            {/* ===========================
                BUTTONS
            =========================== */}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={submitting}
                onClick={() =>
                  navigate("/seller/dashboard")
                }
                className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                ยกเลิก
              </button>

              <button
                type="submit"
                disabled={submitting || quota.loading || !quota.data?.canCreate}
                className="flex items-center justify-center gap-2 rounded-lg bg-[#079486] px-6 py-3 text-sm font-medium text-white hover:bg-[#087f74] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                    กำลังบันทึก...
                  </>
                ) : (
                  <>
                    <House size={18} />
                    สร้างประกาศ
                  </>
                )}
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}

