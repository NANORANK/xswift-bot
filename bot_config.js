// bot_config.js
module.exports = {
  token: process.env.TOKEN,               // โทเค็นบอท
  channelId: process.env.CHANNEL_ID,     // ห้องที่บอทส่งปฏิทิน (เดิม)
  welcomeLog: process.env.WELCOME_LOG,   // ช่องล็อก/แจ้งเตือน (optional)
  welcomeChannel: process.env.WELCOME_CHANNEL, // ช่องหลักที่จะส่งข้อความต้อนรับ (optional)
  welcomeAssignRoleId: process.env.WELCOME_ASSIGN_ROLE_ID, // role id ที่จะมอบให้อัตโนมัติ (optional)
  welcomeSuspiciousDays: process.env.WELCOME_SUSPICIOUS_DAYS ? Number(process.env.WELCOME_SUSPICIOUS_DAYS) : 7, // ระบุวันสำหรับถือว่าเป็นบัญชีใหม่
  welcomeNotifyRoleName: process.env.WELCOME_NOTIFY_ROLE_NAME || "ผู้ดูแล", // ถ้าพบบัญชีใหม่ให้ ping role นี้ (by name)
  timezone: process.env.TIMEZONE || "Asia/Bangkok"
};
