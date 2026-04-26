const { listNotifications } = require("../services/notificationService");

async function listNotificationsHandler(req, res) {
  const notifications = await listNotifications(req.auth.walletAddress);
  res.json(notifications);
}

module.exports = {
  listNotificationsHandler,
};
