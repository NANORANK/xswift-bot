// bot_config.js
module.exports = {
  token: process.env.TOKEN,               // โทเค็นบอท
  channelId: process.env.CHANNEL_ID,     // ห้องที่บอทส่งปฏิทิน (เดิม)
  welcomeLog: process.env.WELCOME_LOG,   // ช่องล็อก/แจ้งเตือน (optional fallback)
  welcomeChannel: process.env.WELCOME_CHANNEL, // ช่องหลักที่จะส่งข้อความต้อนรับ (optional fallback)
  welcomeAssignRoleId: process.env.WELCOME_ASSIGN_ROLE_ID, // role id ที่จะมอบให้อัตโนมัติ (optional)
  welcomeSuspiciousDays: process.env.WELCOME_SUSPICIOUS_DAYS ? Number(process.env.WELCOME_SUSPICIOUS_DAYS) : 7,
  welcomeNotifyRoleName: process.env.WELCOME_NOTIFY_ROLE_NAME || "ผู้ดูแล",
  timezone: process.env.TIMEZONE || "Asia/Bangkok",
  clientId: process.env.CLIENT_ID || null, // optional สำหรับ register commands globally
  // global super-admins (comma separated IDs) — ถ้าใส่ใครไว้เขาจะเป็น super admin ข้ามทุกเซิร์ฟ
  adminIds: process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',').map(s => s.trim()).filter(Boolean) : []
};
