const multer = require("multer");
const path = require("path");
const fs = require("fs");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = "properties";

    if (file.fieldname === "floorPlans") {
      folder = "floorplans";
    }

    if (file.fieldname === "profileImage") {
      folder = "profiles";
    }

    const destination = path.join(
      __dirname,
      "../../uploads",
      folder
    );

    fs.mkdirSync(destination, {
      recursive: true,
    });

    cb(null, destination);
  },

  filename: (req, file, cb) => {
    const extension = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
    }[file.mimetype];

    const name = [
      Date.now(),
      Math.round(Math.random() * 1e9),
    ].join("-");

    cb(null, name + extension);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  if (!allowedTypes.includes(file.mimetype)) {
    return cb(
      new Error(
        "รองรับเฉพาะไฟล์ JPG, PNG และ WEBP"
      )
    );
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,

  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 35,
  },
});

module.exports = upload;