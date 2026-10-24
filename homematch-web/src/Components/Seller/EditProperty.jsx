import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  Upload,
  Trash2,
  Plus,
  House,
  MapPin,
} from "lucide-react";

import api, {API_ORIGIN} from "../../services/Api";


const emptyForm = {
  title: "",
  description: "",
  type: "house",
  price: "",
  bedrooms: "",
  bathrooms: "",
  area: "",
  address: "",
  district: "",
  province: "",
  googleMapsUrl: "",
  latitude: "",
  longitude: "",
};

const imageUrl = (path) => {
  if (!path) return "";
  return /^https?:\/\//i.test(path)
    ? path
    : `${API_ORIGIN}${path}`;
};

const getFormFromProperty = (property) => ({
  title: property.title || "",
  description: property.description || "",
  type: property.type || "house",
  price: String(property.price ?? ""),
  bedrooms: String(property.bedrooms ?? 0),
  bathrooms: String(property.bathrooms ?? 0),
  area: String(property.area ?? 0),
  address: property.location?.address || "",
  district: property.location?.district || "",
  province: property.location?.province || "",
  googleMapsUrl: property.location?.googleMapsUrl || "",
  latitude:
    property.location?.latitude == null
      ? ""
      : String(property.location.latitude),
  longitude:
    property.location?.longitude == null
      ? ""
      : String(property.location.longitude),
});

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100";

const labelClass =
  "mb-2 block text-sm font-semibold text-slate-700";

import useResource from '../../services/useSubscriptionResource';
export default function EditProperty() {
  const quota = useResource('/subscriptions/usage');
  const imageLimit = quota.data?.imageLimit || 5;
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState(emptyForm);
  const [original, setOriginal] = useState(null);

  const [images, setImages] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [floorPlans, setFloorPlans] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ============================
  // LOAD PROPERTY
  // ============================

  useEffect(() => {
    const controller = new AbortController();

    const loadProperty = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/properties/my", {
          signal: controller.signal,
        });

        const data = response.data;

        const list = Array.isArray(data)
          ? data
          : data.properties || [];

        const property = list.find(
          (item) => String(item._id) === String(id)
        );

        if (!property) {
          throw new Error(
            "ไม่พบประกาศ หรือคุณไม่มีสิทธิ์แก้ไขประกาศนี้"
          );
        }

        if (property.status === "sold") {
          throw new Error(
            "ประกาศที่ขายแล้วไม่สามารถแก้ไขได้"
          );
        }

        setOriginal(property);
        setForm(getFormFromProperty(property));
        setImages([...(property.images || [])]);

        setFloorPlans(
          (property.floorPlans || []).map((plan, index) => ({
            key: `existing-${index}`,
            floor: plan.floor,
            imageUrl: plan.imageUrl,
            rooms: plan.rooms || [],
            file: null,
          }))
        );
      } catch (err) {
        if (
          controller.signal.aborted ||
          err.code === "ERR_CANCELED"
        ) {
          return;
        }

        console.error("LOAD PROPERTY ERROR:", err);

        setError(
          err.response?.data?.message ||
            err.message ||
            "โหลดข้อมูลประกาศไม่สำเร็จ"
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadProperty();

    return () => controller.abort();
  }, [id]);

  // ============================
  // FORM HANDLERS
  // ============================

  const changeField = (name, value) => {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddImages = (event) => {
    const files = Array.from(event.target.files || []);

    if (images.length + newImages.length + files.length > imageLimit) {
      setError('รูปภาพบ้านต้องไม่เกิน '+imageLimit+' รูปตามแพ็กเกจ');
      event.target.value = "";
      return;
    }

    setNewImages((prev) => [...prev, ...files]);
    setError("");
    event.target.value = "";
  };

  const removeExistingImage = (index) => {
    setImages((prev) =>
      prev.filter((_, i) => i !== index)
    );
  };

  const removeNewImage = (index) => {
    setNewImages((prev) =>
      prev.filter((_, i) => i !== index)
    );
  };

  const addFloor = () => {
    if (floorPlans.length >= 5) {
      setError("เพิ่มแปลนได้สูงสุด 5 ชั้น");
      return;
    }

    const used = new Set(
      floorPlans.map((plan) => Number(plan.floor))
    );

    let nextFloor = 1;

    while (used.has(nextFloor)) {
      nextFloor++;
    }

    setFloorPlans((prev) => [
      ...prev,
      {
        key: `new-${Date.now()}`,
        floor: nextFloor,
        imageUrl: "",
        rooms: [],
        file: null,
      },
    ]);

    setError("");
  };

  const updateFloor = (key, changes) => {
    setFloorPlans((prev) =>
      prev.map((plan) =>
        plan.key === key
          ? { ...plan, ...changes }
          : plan
      )
    );
  };

  const removeFloor = (key) => {
    setFloorPlans((prev) =>
      prev.filter((plan) => plan.key !== key)
    );
  };

  // ============================
  // UPLOAD IMAGES / FLOOR PLANS
  // ============================

  const uploadFiles = async () => {
    const changedPlans = floorPlans.filter(
      (plan) => plan.file
    );

    if (
      newImages.length === 0 &&
      changedPlans.length === 0
    ) {
      return {
        uploadedImages: [],
        uploadedFloorPlans: [],
      };
    }

    const uploadData = new FormData();

    newImages.forEach((file) => {
      uploadData.append("images", file);
    });

    changedPlans.forEach((plan) => {
      uploadData.append("floorPlans", plan.file);
    });

    console.log("UPLOADING FILES...");

    const response = await api.post(
      "/uploads",
      uploadData
    );

    console.log("UPLOAD RESULT:", response.data);

    return {
      uploadedImages: response.data.images || [],
      uploadedFloorPlans:
        response.data.floorPlans || [],
    };
  };

  // ============================
  // SAVE PROPERTY
  // ============================

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!original || saving) return;

    const price = Number(form.price);

    if (
      !form.title.trim() ||
      !form.description.trim() ||
      !form.address.trim() ||
      !form.district.trim() ||
      !form.province.trim()
    ) {
      setError("กรุณากรอกข้อมูลบ้านให้ครบถ้วน");
      return;
    }

    if (
      !form.price.trim() ||
      !Number.isFinite(price) ||
      price <= 0
    ) {
      setError("กรุณากรอกราคาที่ถูกต้อง");
      return;
    }

    if (images.length + newImages.length === 0) {
      setError("ต้องมีรูปภาพบ้านอย่างน้อย 1 รูป");
      return;
    }

    if (floorPlans.length === 0) {
      setError("ต้องมีแปลนบ้านอย่างน้อย 1 ชั้น");
      return;
    }

    const floors = floorPlans.map(
      (plan) => Number(plan.floor)
    );

    if (
      floors.some(
        (floor) =>
          !Number.isInteger(floor) ||
          floor < 1
      ) ||
      new Set(floors).size !== floors.length
    ) {
      setError(
        "เลขชั้นต้องเป็นจำนวนเต็มบวกและห้ามซ้ำกัน"
      );
      return;
    }

    if (
      floorPlans.some(
        (plan) => !plan.imageUrl && !plan.file
      )
    ) {
      setError("กรุณาเลือกรูปแปลนให้ครบทุกชั้น");
      return;
    }

    const numberFields = [
      form.bedrooms,
      form.bathrooms,
      form.area,
    ];

    if (
      numberFields.some(
        (value) =>
          value === "" ||
          !Number.isFinite(Number(value)) ||
          Number(value) < 0
      )
    ) {
      setError(
        "จำนวนห้องและพื้นที่ต้องเป็นตัวเลขที่ไม่ติดลบ"
      );
      return;
    }

    for (const [value, min, max] of [
      [form.latitude, -90, 90],
      [form.longitude, -180, 180],
    ]) {
      if (
        value !== "" &&
        (!Number.isFinite(Number(value)) ||
          Number(value) < min ||
          Number(value) > max)
      ) {
        setError(
          "พิกัด Latitude หรือ Longitude ไม่ถูกต้อง"
        );
        return;
      }
    }

    try {
      setSaving(true);
      setError("");

      const originalForm =
        getFormFromProperty(original);

      const changedKeys = Object.keys(form).filter(
        (key) => form[key] !== originalForm[key]
      );

      const mediaChanged =
        newImages.length > 0 ||
        images.length !==
          (original.images || []).length ||
        images.some(
          (image, index) =>
            image !== original.images[index]
        ) ||
        floorPlans.length !==
          (original.floorPlans || []).length ||
        floorPlans.some((plan, index) => {
          const oldPlan = original.floorPlans?.[index];

          return (
            !oldPlan ||
            Number(plan.floor) !==
              Number(oldPlan.floor) ||
            plan.imageUrl !== oldPlan.imageUrl ||
            Boolean(plan.file)
          );
        });

      if (
        changedKeys.length === 0 &&
        !mediaChanged
      ) {
        alert("ไม่มีข้อมูลที่เปลี่ยนแปลง");
        return;
      }

      // ============================
      // PRICE ONLY
      // ============================

      if (
        changedKeys.length === 1 &&
        changedKeys[0] === "price" &&
        !mediaChanged
      ) {
        console.log(
          "PATCH PRICE:",
          `/properties/${id}/price`
        );

        await api.patch(
          `/properties/${id}/price`,
          { price }
        );

        alert("แก้ไขราคาสำเร็จ");
        navigate("/seller/dashboard");
        return;
      }

      // ============================
      // FULL PROPERTY UPDATE
      // ============================

      const uploadResult = await uploadFiles();

      let uploadedIndex = 0;

      const finalFloorPlans = floorPlans.map(
        (plan) => {
          const url = plan.file
            ? uploadResult.uploadedFloorPlans[
                uploadedIndex++
              ]
            : plan.imageUrl;

          return {
            floor: Number(plan.floor),
            imageUrl: url,
            rooms: plan.file ? [] : plan.rooms,
          };
        }
      );

      if (
        finalFloorPlans.some(
          (plan) => !plan.imageUrl
        )
      ) {
        throw new Error(
          "อัปโหลดรูปแปลนไม่สำเร็จ"
        );
      }

      const finalImages = [
        ...images,
        ...uploadResult.uploadedImages,
      ];

      if (
        finalImages.length !==
        images.length + newImages.length
      ) {
        throw new Error(
          "อัปโหลดรูปภาพบ้านไม่สำเร็จ"
        );
      }

      const location = {
        ...(original.location || {}),
        address: form.address.trim(),
        district: form.district.trim(),
        province: form.province.trim(),
        googleMapsUrl: form.googleMapsUrl.trim(),
        latitude:
          form.latitude === ""
            ? null
            : Number(form.latitude),
        longitude:
          form.longitude === ""
            ? null
            : Number(form.longitude),
      };

      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        type: form.type,
        price,
        bedrooms: Number(form.bedrooms),
        bathrooms: Number(form.bathrooms),
        area: Number(form.area),
        location,
        images: finalImages,
        floorPlans: finalFloorPlans,
      };

      console.log("UPDATE PROPERTY REQUEST:", {
        method: "PATCH",
        url: `/properties/${id}`,
        payload,
      });

      const response = await api.patch(
        `/properties/${id}`,
        payload
      );

      console.log(
        "UPDATE PROPERTY SUCCESS:",
        response.data
      );

      alert(
        "แก้ไขประกาศสำเร็จ รอ Admin ตรวจสอบอีกครั้ง"
      );

      navigate("/seller/dashboard");
    } catch (err) {
      // ============================
      // DETAILED ERROR HANDLING
      // ============================

      const status = err.response?.status;
      const method =
        err.config?.method?.toUpperCase() || "UNKNOWN";

      const url =
        err.config?.url || "UNKNOWN";

      const baseURL =
        err.config?.baseURL || "";

      console.error("UPDATE PROPERTY ERROR:", {
        status,
        method,
        url,
        baseURL,
        fullURL: `${baseURL}${url}`,
        response: err.response?.data,
        message: err.message,
      });

      if (status === 404) {
        setError(
          `เกิดข้อผิดพลาด 404: ${method} ${url} — ` +
          "ไม่พบ API หรือไม่พบประกาศที่ต้องการแก้ไข"
        );
      } else if (status === 401) {
        setError(
          "Session หมดอายุ กรุณาเข้าสู่ระบบใหม่"
        );
      } else if (status === 403) {
        setError(
          "คุณไม่มีสิทธิ์แก้ไขประกาศนี้"
        );
      } else if (status === 400) {
        setError(
          err.response?.data?.message ||
          "ข้อมูลที่ส่งไม่ถูกต้อง"
        );
      } else if (status >= 500) {
        setError(
          err.response?.data?.message ||
          "Backend เกิดข้อผิดพลาด กรุณาตรวจสอบ Terminal"
        );
      } else {
        setError(
          err.response?.data?.message ||
          err.message ||
          "บันทึกประกาศไม่สำเร็จ"
        );
      }
    } finally {
      setSaving(false);
    }
  };

  // ============================
  // LOADING
  // ============================

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
        กำลังโหลดข้อมูลประกาศ...
      </div>
    );
  }

  if (!original) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <p className="mb-4 text-red-600">
          {error}
        </p>

        <button
          onClick={() =>
            navigate("/seller/dashboard")
          }
          className="text-teal-700 underline"
        >
          กลับแดชบอร์ด
        </button>
      </div>
    );
  }

  // ============================
  // UI
  // ============================

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="mx-auto max-w-5xl p-4 sm:p-8">

        {/* BACK */}
        <button
          type="button"
          onClick={() =>
            navigate("/seller/dashboard")
          }
          className="mb-5 flex items-center gap-2 text-sm text-slate-600 hover:text-teal-700"
        >
          <ArrowLeft size={18} />
          กลับแดชบอร์ด
        </button>

        {/* HEADER */}
        <div className="mb-6">
          <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-900">
            <House className="text-teal-600" />
            แก้ไขประกาศบ้าน
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            แก้ไขรายละเอียด รูปภาพ แปลนบ้าน และที่อยู่
          </p>

          <p className="mt-2 text-sm text-amber-700">
            หมายเหตุ: การแก้ไขข้อมูลอื่นนอกจากราคา
            จะส่งประกาศให้ Admin ตรวจสอบใหม่
          </p>
        </div>

        {/* ERROR */}
        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <p className="font-bold">
              บันทึกข้อมูลไม่สำเร็จ
            </p>
            <p className="mt-1">{error}</p>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {/* ============================
              BASIC INFORMATION
          ============================ */}

          <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-7">
            <h2 className="mb-5 text-lg font-bold">
              ข้อมูลประกาศ
            </h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="property-title" className={labelClass}>
                  ชื่อประกาศ
                </label>

                <input id="property-title"
                  className={inputClass}
                  value={form.title}
                  onChange={(e) =>
                    changeField(
                      "title",
                      e.target.value
                    )
                  }
                  required
                />
              </div>

              <div>
                <label htmlFor="property-description" className={labelClass}>
                  รายละเอียดบ้าน
                </label>

                <textarea id="property-description"
                  rows={5}
                  className={inputClass}
                  value={form.description}
                  onChange={(e) =>
                    changeField(
                      "description",
                      e.target.value
                    )
                  }
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="property-type" className={labelClass}>
                    ประเภทบ้าน
                  </label>

                  <select id="property-type"
                    className={inputClass}
                    value={form.type}
                    onChange={(e) =>
                      changeField(
                        "type",
                        e.target.value
                      )
                    }
                  >
                    <option value="house">
                      บ้านเดี่ยว
                    </option>
                    <option value="townhouse">
                      ทาวน์เฮ้าส์
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
                  <label htmlFor="property-price" className={labelClass}>
                    ราคา (บาท)
                  </label>

                  <input id="property-price"
                    type="number"
                    min="1"
                    className={inputClass}
                    value={form.price}
                    onChange={(e) =>
                      changeField(
                        "price",
                        e.target.value
                      )
                    }
                    required
                  />
                </div>

                {[
                  ["bedrooms", "ห้องนอน"],
                  ["bathrooms", "ห้องน้ำ"],
                  ["area", "พื้นที่ (ตร.ม.)"],
                ].map(([name, label]) => (
                  <div key={name}>
                    <label className={labelClass}>
                      {label}
                    </label>

                    <input
                      type="number"
                      min="0"
                      className={inputClass}
                      value={form[name]}
                      onChange={(e) =>
                        changeField(
                          name,
                          e.target.value
                        )
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ============================
              LOCATION
          ============================ */}

          <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-7">
            <h2 className="mb-5 flex items-center gap-2 text-lg font-bold">
              <MapPin size={20} />
              ที่อยู่และ Google Maps
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["address", "ที่อยู่"],
                ["district", "อำเภอ / เขต"],
                ["province", "จังหวัด"],
                ["googleMapsUrl", "ลิงก์ Google Maps"],
                ["latitude", "Latitude"],
                ["longitude", "Longitude"],
              ].map(([name, label]) => (
                <div
                  key={name}
                  className={
                    name === "address" ||
                    name === "googleMapsUrl"
                      ? "sm:col-span-2"
                      : ""
                  }
                >
                  <label className={labelClass}>
                    {label}
                  </label>

                  <input
                    className={inputClass}
                    type={
                      name === "latitude" ||
                      name === "longitude"
                        ? "number"
                        : "text"
                    }
                    step={
                      name === "latitude" ||
                      name === "longitude"
                        ? "any"
                        : undefined
                    }
                    value={form[name]}
                    onChange={(e) =>
                      changeField(
                        name,
                        e.target.value
                      )
                    }
                    required={[
                      "address",
                      "district",
                      "province",
                    ].includes(name)}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* ============================
              IMAGES
          ============================ */}

          <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-7">
            <h2 className="mb-2 text-lg font-bold">
              รูปภาพบ้าน
            </h2>

            <p className="mb-5 text-sm text-slate-500">
              เก็บรูปเดิมไว้ ลบรูปที่ไม่ต้องการ
              หรืออัปโหลดรูปใหม่ได้ สูงสุด {imageLimit} รูปตามแพ็กเกจ (รูปเดิมยังคงอยู่เมื่อหมดอายุ)
            </p>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {images.map((path, index) => (
                <div
                  key={`${path}-${index}`}
                  className="relative"
                >
                  <img
                    src={imageUrl(path)}
                    alt={`รูปบ้าน ${index + 1}`}
                    className="h-32 w-full rounded-xl object-cover"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      removeExistingImage(index)
                    }
                    className="absolute right-2 top-2 rounded-lg bg-red-600 p-2 text-white"
                    aria-label="ลบรูปภาพ"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}

              {newImages.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="relative"
                >
                  <div className="flex h-32 items-center justify-center rounded-xl bg-teal-50 p-3 text-center text-xs text-teal-700">
                    {file.name}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      removeNewImage(index)
                    }
                    className="absolute right-2 top-2 rounded-lg bg-red-600 p-2 text-white"
                    aria-label="ลบรูปใหม่"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>

            <label className="mt-5 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-teal-300 p-5 text-sm font-semibold text-teal-700 hover:bg-teal-50">
              <Upload size={20} />
              เพิ่มรูปภาพบ้าน

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleAddImages}
                className="hidden"
              />
            </label>
          </section>

          {/* ============================
              FLOOR PLANS
          ============================ */}

          <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">
                  แปลนบ้าน 2D
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  เปลี่ยนรูปแปลนได้โดยไม่กระทบชั้นอื่น
                </p>
              </div>

              <button
                type="button"
                onClick={addFloor}
                disabled={floorPlans.length >= 5}
                className="flex items-center gap-2 rounded-xl bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700 disabled:opacity-40"
              >
                <Plus size={17} />
                เพิ่มชั้น
              </button>
            </div>

            <div className="space-y-4">
              {floorPlans.map((plan) => (
                <div
                  key={plan.key}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <label className="font-semibold">
                      แปลนชั้นที่
                    </label>

                    <button
                      type="button"
                      onClick={() =>
                        removeFloor(plan.key)
                      }
                      className="flex items-center gap-1 text-sm text-red-600"
                    >
                      <Trash2 size={16} />
                      ลบชั้น
                    </button>
                  </div>

                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={plan.floor}
                    onChange={(e) =>
                      updateFloor(plan.key, {
                        floor: e.target.value,
                      })
                    }
                    className={`${inputClass} mb-4`}
                  />

                  {plan.imageUrl && !plan.file && (
                    <img
                      src={imageUrl(plan.imageUrl)}
                      alt={`แปลนชั้น ${plan.floor}`}
                      className="mb-4 max-h-72 rounded-xl border object-contain"
                    />
                  )}

                  {plan.file && (
                    <p className="mb-4 rounded-lg bg-teal-50 p-3 text-sm text-teal-700">
                      รูปใหม่: {plan.file.name}
                    </p>
                  )}

                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600 hover:bg-slate-50">
                    <Upload size={18} />
                    เลือกรูปแปลนใหม่

                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file =
                          e.target.files?.[0];

                        if (file) {
                          updateFloor(plan.key, {
                            file,
                          });
                        }

                        e.target.value = "";
                      }}
                    />
                  </label>

                  <p className="mt-3 text-xs text-slate-500">
                    ตำแหน่งห้องเดิม:{" "}
                    {plan.rooms.length} ห้อง
                    {plan.file
                      ? " — การเปลี่ยนรูปแปลนจะล้างตำแหน่งห้องเดิมของชั้นนี้"
                      : " — จะเก็บไว้เหมือนเดิม"}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* ============================
              SAVE BUTTONS
          ============================ */}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() =>
                navigate("/seller/dashboard")
              }
              disabled={saving}
              className="rounded-xl border border-slate-200 bg-white px-6 py-3 font-semibold text-slate-600"
            >
              ยกเลิก
            </button>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#079486] px-8 py-3 font-bold text-white hover:bg-[#087f74] disabled:opacity-50"
            >
              <Save size={18} />

              {saving
                ? "กำลังบันทึก..."
                : "บันทึกการแก้ไข"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

