const Notification = require("../models/Notification");

// =====================================================
// GET MY NOTIFICATIONS
// GET /api/notifications
// =====================================================

exports.getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      user: req.user._id,
    })

      // ================================================
      // PROPERTY
      // ================================================
      .populate(
        "property",
        "title images location"
      )

      // ================================================
      // APPOINTMENT
      // ================================================
      .populate(
        "appointment",
        "appointmentDate appointmentTime status rejectionReason"
      )

      // ================================================
      // CONVERSATION
      // ================================================
      .populate({
        path: "conversation",

        select:
          "buyer seller property lastMessage lastMessageAt",

        populate: [
          {
            path: "buyer",
            select:
              "name email phone role",
          },
          {
            path: "seller",
            select:
              "name email phone role",
          },
          {
            path: "property",
            select:
              "title images location",
          },
        ],
      })

      // ใหม่สุดอยู่ด้านบน
      .sort({
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      count: notifications.length,
      notifications,
    });
  } catch (error) {
    console.error(
      "GET NOTIFICATIONS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "ไม่สามารถโหลดการแจ้งเตือนได้",
    });
  }
};

// =====================================================
// GET UNREAD COUNT
// GET /api/notifications/unread-count
// =====================================================

exports.getUnreadCount = async (req, res) => {
  try {
    const count =
      await Notification.countDocuments({
        user: req.user._id,
        isRead: false,
      });

    return res.status(200).json({
      success: true,
      count,
    });
  } catch (error) {
    console.error(
      "GET UNREAD COUNT ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "ไม่สามารถโหลดจำนวนการแจ้งเตือนได้",
    });
  }
};

// =====================================================
// MARK ONE AS READ
// PATCH /api/notifications/:id/read
// =====================================================

exports.markAsRead = async (req, res) => {
  try {
    const notification =
      await Notification.findOne({
        _id: req.params.id,
        user: req.user._id,
      });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message:
          "ไม่พบการแจ้งเตือน",
      });
    }

    // ถ้าอ่านแล้วก็ไม่เป็นไร
    if (!notification.isRead) {
      notification.isRead = true;

      await notification.save();
    }

    return res.status(200).json({
      success: true,
      message:
        "อ่านการแจ้งเตือนแล้ว",
      notification,
    });
  } catch (error) {
    console.error(
      "MARK NOTIFICATION READ ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "ไม่สามารถอัปเดตการแจ้งเตือนได้",
    });
  }
};

// =====================================================
// MARK ALL AS READ
// PATCH /api/notifications/read-all
// =====================================================

exports.markAllAsRead = async (req, res) => {
  try {
    const result =
      await Notification.updateMany(
        {
          user: req.user._id,
          isRead: false,
        },
        {
          $set: {
            isRead: true,
          },
        }
      );

    return res.status(200).json({
      success: true,
      message:
        "อ่านการแจ้งเตือนทั้งหมดแล้ว",
      modifiedCount:
        result.modifiedCount,
    });
  } catch (error) {
    console.error(
      "MARK ALL NOTIFICATIONS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "ไม่สามารถอัปเดตการแจ้งเตือนได้",
    });
  }
};