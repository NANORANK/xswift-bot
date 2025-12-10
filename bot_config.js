// bot_config.js
module.exports = {
  token: process.env.TOKEN,          // โทเค็นบอท
  channelId: process.env.CHANNEL_ID, // ห้องที่บอทส่งปฏิทิน
  welcomeLog: process.env.WELCOME_LOG, // ห้องแจ้งเตือนเวลามีคนกดรับยศ
  timezone: process.env.TIMEZONE || "Asia/Bangkok"
};
