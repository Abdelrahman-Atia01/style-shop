import { Notification } from '../../DB/models/notification.model.js';

// GET /api/notifications  – returns unread count + latest 20 for the current user's role
export const getMyNotifications = async (req, res) => {
  try {
    const role   = req.user.role;
    const userId = req.user.id;

    const notifications = await Notification.find({ audience: role })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const data = notifications.map(n => ({
      ...n,
      is_read: n.read_by?.some(id => String(id) === String(userId)) || false,
    }));

    const unread = data.filter(n => !n.is_read).length;

    res.json({ success: true, data, unread });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/notifications/:id/read
export const markRead = async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, {
      $addToSet: { read_by: req.user.id },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/notifications/read-all
export const markAllRead = async (req, res) => {
  try {
    const role = req.user.role;
    await Notification.updateMany(
      { audience: role, read_by: { $ne: req.user.id } },
      { $addToSet: { read_by: req.user.id } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
