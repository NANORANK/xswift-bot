// bot_config.js
module.exports = {
  token: process.env.TOKEN,           // token จะไปอยู่ใน Railway ENV
  channelId: process.env.CHANNEL_ID,  // channel id จะตั้งใน Railway เช่นกัน
  timezone: process.env.TIMEZONE || "Asia/Bangkok",
};
