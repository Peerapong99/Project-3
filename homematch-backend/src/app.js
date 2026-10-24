
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const connectDB = require("./config/db");

// =========================
// ROUTES เดิม
// =========================

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const propertyRoutes = require("./routes/propertyRoutes");
const uploadRoutes = require("./routes/uploadRoutes");

// =========================
// APPOINTMENT ROUTES
// =========================

const appointmentRoutes = require("./routes/appointmentRoutes");

// =========================
// CHAT ROUTES
// =========================

const chatRoutes = require("./routes/chatRoutes");

// =========================
// ROOM DESIGN ROUTES
// =========================

const roomDesignRoutes = require("./routes/roomDesignRoutes");

// =========================
// NOTIFICATION ROUTES
// =========================

const notificationRoutes = require("./routes/notificationRoutes");

// =========================
// PURCHASE OFFER ROUTES (ใหม่)
// =========================

const offerRoutes = require("./routes/offerRoutes");
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const subscriptionPayments = require('./routes/subscriptionPaymentRoutes');
const { seedPlans } = require('./services/subscriptionService');

// =========================
// APP
// =========================

const app = express();

// =========================
// CORS
// =========================

app.use(
  cors({
    origin: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map(value=>value.trim()).filter(Boolean),
  })
);

// =========================
// MIDDLEWARE
// =========================

app.use(express.json({ limit: "1mb" }));

// =========================
// STATIC UPLOADS
// =========================

app.use(
  "/uploads",
  (req,res,next)=>{res.set("X-Content-Type-Options","nosniff");next();},
  express.static(
    path.join(__dirname, "../uploads")
  )
);

// =========================
// TEST BACKEND
// =========================

app.get("/", (req, res) => {
  res.json({
    message: "HomeMatch Backend is running",
  });
});

// =========================
// AUTHENTICATION
// =========================

app.use("/api/auth", authRoutes);
app.use('/api/subscriptions/payments', subscriptionPayments.router);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/admin/subscriptions', subscriptionPayments.adminRouter);

// =========================
// ADMIN
// =========================

app.use("/api/admin", adminRoutes);

// =========================
// PROPERTY
// =========================

app.use("/api/properties", propertyRoutes);

// =========================
// UPLOAD IMAGES
// =========================

app.use("/api/uploads", uploadRoutes);

// =========================
// APPOINTMENT
// =========================

app.use(
  "/api/appointments",
  appointmentRoutes
);

// =========================
// CHAT
// =========================

app.use(
  "/api/chat",
  chatRoutes
);

// =========================
// ROOM DESIGN
// =========================

app.use(
  "/api/room-designs",
  roomDesignRoutes
);

// =========================
// NOTIFICATION
// =========================

app.use(
  "/api/notifications",
  notificationRoutes
);

// =========================
// PURCHASE OFFER (ใหม่)
// =========================

app.use(
  "/api/offers",
  offerRoutes
);

// =========================
// ERROR HANDLER
// =========================

app.use((err,req,res,next)=>{
  if(res.headersSent) return next(err);
  const validation=['ValidationError','CastError','MulterError'].includes(err.name);
  const status=err.status>=400 && err.status<600?err.status:validation?400:500;
  if(status>=500) console.error('REQUEST ERROR:',err);
  res.status(status).json({message:status>=500?'เกิดข้อผิดพลาดภายในระบบ':err.message,code:err.code || (validation?'VALIDATION_ERROR':'INTERNAL_ERROR')});
});

// =========================
// START SERVER
// =========================

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDB();
    await seedPlans();
    await require("./services/designCatalogService").seedDefaultDesignPrices();

    app.listen(PORT, () => {
      console.log(
        `Server running on port ${PORT}`
      );

      console.log(
        `Chat API: http://localhost:${PORT}/api/chat`
      );

      console.log(
        `Room Design API: http://localhost:${PORT}/api/room-designs`
      );

      console.log(
        `Notification API: http://localhost:${PORT}/api/notifications`
      );

      console.log(
        `Purchase Offer API: http://localhost:${PORT}/api/offers`
      );
    });
  } catch (error) {
    console.error(
      "Failed to start server:",
      error
    );

    process.exit(1);
  }
};

startServer();
