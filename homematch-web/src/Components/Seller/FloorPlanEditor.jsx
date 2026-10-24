import { useState } from "react";
import {
  MapPin,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  BedDouble,
  Images,
  Upload,
} from "lucide-react";

export default function FloorPlanEditor({
  imageUrl,
  rooms = [],
  onChange,
}) {
  const [selectedRoomIndex, setSelectedRoomIndex] =
    useState(null);

  const [roomForm, setRoomForm] = useState(null);

  // =====================================
  // คลิกบน Floor Plan
  // =====================================

  const handlePlanClick = (event) => {
    if (roomForm) return;

    const rect =
      event.currentTarget.getBoundingClientRect();

    const x =
      ((event.clientX - rect.left) /
        rect.width) *
      100;

    const y =
      ((event.clientY - rect.top) /
        rect.height) *
      100;

    setSelectedRoomIndex(null);

    setRoomForm({
      name: "",
      description: "",
      x,
      y,

      // เก็บ File จริง
      imageFiles: [],

      // เก็บ URL preview
      imagePreviews: [],
    });
  };

  // =====================================
  // เปลี่ยน Input
  // =====================================

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setRoomForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // =====================================
  // เลือกรูปของห้อง
  // =====================================

  const handleRoomImages = (event) => {
    const files = Array.from(
      event.target.files
    );

    if (files.length === 0) return;

    setRoomForm((previous) => {
      const oldFiles =
        previous.imageFiles || [];

      const oldPreviews =
        previous.imagePreviews || [];

      // สูงสุด 5 รูปต่อห้อง
      const available =
        5 - oldFiles.length;

      const selectedFiles =
        files.slice(0, available);

      const newPreviews =
        selectedFiles.map((file) =>
          URL.createObjectURL(file)
        );

      return {
        ...previous,

        imageFiles: [
          ...oldFiles,
          ...selectedFiles,
        ],

        imagePreviews: [
          ...oldPreviews,
          ...newPreviews,
        ],
      };
    });

    event.target.value = "";
  };

  // =====================================
  // ลบรูปของห้อง
  // =====================================

  const removeRoomImage = (
    imageIndex
  ) => {
    setRoomForm((previous) => {
      const preview =
        previous.imagePreviews?.[
          imageIndex
        ];

      if (preview) {
        URL.revokeObjectURL(preview);
      }

      return {
        ...previous,

        imageFiles:
          previous.imageFiles.filter(
            (_, index) =>
              index !== imageIndex
          ),

        imagePreviews:
          previous.imagePreviews.filter(
            (_, index) =>
              index !== imageIndex
          ),
      };
    });
  };

  // =====================================
  // บันทึกห้อง
  // =====================================

  const saveRoom = () => {
    if (!roomForm?.name.trim()) {
      alert("กรุณากรอกชื่อห้อง");
      return;
    }

    const roomData = {
      ...roomForm,

      name: roomForm.name.trim(),

      description:
        roomForm.description.trim(),

      // images จะถูกสร้างหลัง Upload
      images: roomForm.images || [],
    };

    if (selectedRoomIndex !== null) {
      const updatedRooms =
        rooms.map((room, index) =>
          index === selectedRoomIndex
            ? roomData
            : room
        );

      onChange(updatedRooms);
    } else {
      onChange([
        ...rooms,
        roomData,
      ]);
    }

    setRoomForm(null);
    setSelectedRoomIndex(null);
  };

  // =====================================
  // แก้ไขห้อง
  // =====================================

  const editRoom = (index) => {
    const room = rooms[index];

    setSelectedRoomIndex(index);

    setRoomForm({
      ...room,

      imageFiles:
        room.imageFiles || [],

      imagePreviews:
        room.imagePreviews || [],
    });
  };

  // =====================================
  // ลบห้อง
  // =====================================

  const deleteRoom = (index) => {
    const room = rooms[index];

    const confirmed =
      window.confirm(
        `ต้องการลบ "${room.name}" หรือไม่?`
      );

    if (!confirmed) return;

    // ลบ Blob Preview
    room.imagePreviews?.forEach(
      (preview) => {
        if (
          preview?.startsWith("blob:")
        ) {
          URL.revokeObjectURL(
            preview
          );
        }
      }
    );

    const updatedRooms =
      rooms.filter(
        (_, roomIndex) =>
          roomIndex !== index
      );

    onChange(updatedRooms);

    setRoomForm(null);
    setSelectedRoomIndex(null);
  };

  // =====================================
  // ยกเลิก Form
  // =====================================

  const cancelForm = () => {
    /*
      ถ้าเป็นห้องใหม่และกดยกเลิก
      Preview ที่สร้างไว้ไม่จำเป็นแล้ว
    */

    if (
      selectedRoomIndex === null
    ) {
      roomForm?.imagePreviews?.forEach(
        (preview) => {
          if (
            preview?.startsWith("blob:")
          ) {
            URL.revokeObjectURL(
              preview
            );
          }
        }
      );
    }

    setRoomForm(null);
    setSelectedRoomIndex(null);
  };

  // =====================================
  // Drag Marker
  // =====================================

  const handleDragStart = (
    event,
    index
  ) => {
    event.dataTransfer.setData(
      "roomIndex",
      String(index)
    );
  };

  const handleDragOver = (
    event
  ) => {
    event.preventDefault();
  };

  const handleDrop = (event) => {
    event.preventDefault();

    const index = Number(
      event.dataTransfer.getData(
        "roomIndex"
      )
    );

    if (Number.isNaN(index)) {
      return;
    }

    const rect =
      event.currentTarget.getBoundingClientRect();

    let x =
      ((event.clientX - rect.left) /
        rect.width) *
      100;

    let y =
      ((event.clientY - rect.top) /
        rect.height) *
      100;

    x = Math.max(
      0,
      Math.min(100, x)
    );

    y = Math.max(
      0,
      Math.min(100, y)
    );

    const updatedRooms =
      rooms.map(
        (room, roomIndex) =>
          roomIndex === index
            ? {
                ...room,
                x,
                y,
              }
            : room
      );

    onChange(updatedRooms);
  };

  // =====================================
  // ไม่มี Floor Plan
  // =====================================

  if (!imageUrl) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center">

        <MapPin
          size={28}
          className="mx-auto text-slate-300"
        />

        <p className="mt-2 text-sm text-slate-500">
          กรุณาอัปโหลด Floor Plan
          ก่อนกำหนดห้อง
        </p>

      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* =====================================
          คำแนะนำ
      ===================================== */}

      <div className="rounded-lg bg-teal-50 p-4">

        <div className="flex gap-3">

          <MapPin
            size={20}
            className="mt-0.5 shrink-0 text-[#079486]"
          />

          <div>

            <p className="text-sm font-medium text-teal-800">
              กำหนดตำแหน่งห้อง
            </p>

            <p className="mt-1 text-xs leading-5 text-teal-700">
              คลิกตำแหน่งห้องบนแปลน
              จากนั้นกรอกชื่อ รายละเอียด
              และเพิ่มรูปภาพของห้อง
            </p>

          </div>

        </div>

      </div>

      {/* =====================================
          Interactive Floor Plan
      ===================================== */}

      <div
        className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
        onClick={handlePlanClick}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >

        <img
          src={imageUrl}
          alt="Floor Plan"
          draggable={false}
          className="block w-full select-none object-contain"
        />

        {/* Marker ห้อง */}

        {rooms.map((room, index) => (
          <button
            key={`${room.name}-${index}`}
            type="button"
            draggable
            onDragStart={(event) =>
              handleDragStart(
                event,
                index
              )
            }
            onClick={(event) => {
              event.stopPropagation();

              editRoom(index);
            }}
            style={{
              left: `${room.x}%`,
              top: `${room.y}%`,
            }}
            className="group absolute -translate-x-1/2 -translate-y-1/2 cursor-grab"
          >

            <div className="flex flex-col items-center">

              <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[#079486] text-white shadow-lg transition group-hover:scale-110">
                <MapPin size={18} />
              </div>

              <span className="mt-1 max-w-32 truncate rounded-md bg-slate-900/80 px-2 py-1 text-xs font-medium text-white shadow">
                {room.name}
              </span>

            </div>

          </button>
        ))}

        {/* Marker ที่กำลังสร้าง */}

        {roomForm &&
          selectedRoomIndex ===
            null && (
            <div
              style={{
                left: `${roomForm.x}%`,
                top: `${roomForm.y}%`,
              }}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
            >

              <div className="flex h-10 w-10 animate-pulse items-center justify-center rounded-full border-2 border-white bg-amber-500 text-white shadow-lg">
                <Plus size={20} />
              </div>

            </div>
          )}

      </div>

      {/* =====================================
          Form ห้อง
      ===================================== */}

      {roomForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">

          {/* Header */}

          <div className="mb-4 flex items-center justify-between">

            <div>

              <h3 className="font-semibold text-slate-900">
                {selectedRoomIndex !==
                null
                  ? "แก้ไขข้อมูลห้อง"
                  : "เพิ่มห้องใหม่"}
              </h3>

              <p className="mt-1 text-xs text-slate-400">
                X:{" "}
                {Number(
                  roomForm.x
                ).toFixed(1)}
                %
                {" • "}
                Y:{" "}
                {Number(
                  roomForm.y
                ).toFixed(1)}
                %
              </p>

            </div>

            <button
              type="button"
              onClick={cancelForm}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
            >
              <X size={18} />
            </button>

          </div>

          <div className="space-y-5">

            {/* ชื่อห้อง */}

            <div>

              <label className="mb-2 block text-sm font-medium text-slate-700">
                ชื่อห้อง *
              </label>

              <input
                type="text"
                name="name"
                value={
                  roomForm.name
                }
                onChange={
                  handleInputChange
                }
                placeholder="เช่น ห้องนอนใหญ่"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-[#079486]"
              />

            </div>

            {/* รายละเอียด */}

            <div>

              <label className="mb-2 block text-sm font-medium text-slate-700">
                รายละเอียดห้อง
              </label>

              <textarea
                name="description"
                value={
                  roomForm.description
                }
                onChange={
                  handleInputChange
                }
                rows={3}
                placeholder="เช่น ห้องนอนใหญ่ พร้อมห้องน้ำในตัว"
                className="w-full resize-none rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-[#079486]"
              />

            </div>

            {/* =====================================
                รูปภาพห้อง
            ===================================== */}

            <div>

              <div className="mb-2 flex items-center justify-between">

                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">

                  <Images
                    size={17}
                  />

                  รูปภาพห้อง

                </label>

                <span className="text-xs text-slate-400">
                  สูงสุด 5 รูป
                </span>

              </div>

              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 p-5 transition hover:border-[#079486] hover:bg-teal-50/30">

                <Upload
                  size={20}
                  className="text-[#079486]"
                />

                <span className="text-sm text-slate-600">
                  เพิ่มรูปภาพห้อง
                </span>

                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={
                    handleRoomImages
                  }
                  className="hidden"
                />

              </label>

              {/* Preview รูปห้อง */}

              {roomForm
                .imagePreviews
                ?.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">

                  {roomForm.imagePreviews.map(
                    (
                      preview,
                      imageIndex
                    ) => (
                      <div
                        key={`${preview}-${imageIndex}`}
                        className="relative overflow-hidden rounded-lg border border-slate-200"
                      >

                        <img
                          src={preview}
                          alt={`Room ${imageIndex + 1}`}
                          className="h-28 w-full object-cover"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            removeRoomImage(
                              imageIndex
                            )
                          }
                          className="absolute right-2 top-2 rounded-full bg-white p-1.5 text-red-500 shadow hover:bg-red-50"
                        >
                          <X
                            size={14}
                          />
                        </button>

                      </div>
                    )
                  )}

                </div>
              )}

            </div>

            {/* Buttons */}

            <div className="flex flex-wrap justify-end gap-2">

              {selectedRoomIndex !==
                null && (
                <button
                  type="button"
                  onClick={() =>
                    deleteRoom(
                      selectedRoomIndex
                    )
                  }
                  className="flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50"
                >
                  <Trash2 size={16} />
                  ลบห้อง
                </button>
              )}

              <button
                type="button"
                onClick={cancelForm}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                ยกเลิก
              </button>

              <button
                type="button"
                onClick={saveRoom}
                className="flex items-center gap-2 rounded-lg bg-[#079486] px-4 py-2 text-sm font-medium text-white hover:bg-[#087f74]"
              >

                <Check size={16} />

                {selectedRoomIndex !==
                null
                  ? "บันทึกการแก้ไข"
                  : "เพิ่มห้อง"}

              </button>

            </div>

          </div>

        </div>
      )}

      {/* =====================================
          รายการห้อง
      ===================================== */}

      {rooms.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200">

          <div className="border-b border-slate-200 px-4 py-3">

            <h3 className="text-sm font-semibold text-slate-900">
              ห้องที่กำหนดแล้ว (
              {rooms.length})
            </h3>

          </div>

          <div className="divide-y divide-slate-100">

            {rooms.map(
              (room, index) => (
                <div
                  key={`${room.name}-list-${index}`}
                  className="flex items-center justify-between gap-3 p-4"
                >

                  <div className="flex min-w-0 items-center gap-3">

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-[#079486]">
                      <BedDouble
                        size={18}
                      />
                    </div>

                    <div className="min-w-0">

                      <p className="truncate text-sm font-medium text-slate-800">
                        {room.name}
                      </p>

                      <p className="mt-0.5 truncate text-xs text-slate-400">
                        {room.description ||
                          "ไม่มีรายละเอียด"}
                      </p>

                      <div className="mt-1 flex items-center gap-1 text-xs text-slate-400">

                        <Images
                          size={13}
                        />

                        {room
                          .imageFiles
                          ?.length ||
                          room.images
                            ?.length ||
                          0}{" "}
                        รูป

                      </div>

                    </div>

                  </div>

                  <div className="flex shrink-0 items-center gap-1">

                    <button
                      type="button"
                      onClick={() =>
                        editRoom(
                          index
                        )
                      }
                      className="rounded-lg p-2 text-slate-400 hover:bg-teal-50 hover:text-[#079486]"
                    >
                      <Pencil
                        size={16}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        deleteRoom(
                          index
                        )
                      }
                      className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2
                        size={16}
                      />
                    </button>

                  </div>

                </div>
              )
            )}

          </div>

        </div>
      )}

    </div>
  );
}