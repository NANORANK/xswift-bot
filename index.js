// index.js — เวอร์ชันเต็มสุดของปาย 💗

const express = require("express");
const { 
  Client, 
  GatewayIntentBits, 
  EmbedBuilder 
} = require("discord.js");

const {
  joinVoiceChannel,
  createAudioPlayer,
  NoSubscriberBehavior,
} = require("@discordjs/voice");

const cron = require("node-cron");

// โหลดค่า ENV จาก Railway
const TOKEN = process.env.TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const TIMEZONE = process.env.TIMEZONE || "Asia/Bangkok";
const VOICE_ID = process.env.VOICE_ID;

// ---------- Web Server ----------
const app = express();
app.get("/", (req, res) => res.send("Bot running"));
app.listen(8080, () => console.log("Web server running on port 8080"));

// ---------- Discord Client ----------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// ---------- ฟังก์ชันเลขแบบ ➊ ➋ ➌ ----------
const fancyNumbers = [
  "0","➊","➋","➌","➍","➎","➏","➐","➑","➒","➓",
  "➊➊","➊➋","➊➌","➊➍","➊➎","➊➏","➊➐","➊➑","➊➒",
  "➋➓","➋➊","➋➋","➋➌","➋➍","➋➎","➋➏","➋➐","➋➑","➋➒","➌➊"
];

// ---------- ฟังก์ชันวันสำคัญ ----------
function getThaiHoliday(date) {
  const d = date.getDate();
  const m = date.getMonth() + 1;

  if (m === 4 && d === 13) return "วันสงกรานต์";
  if (m === 4 && d === 14) return "วันสงกรานต์";
  if (m === 4 && d === 15) return "วันสงกรานต์";

  // ตัวอย่างวันพระแบบง่าย
  if (d % 15 === 0) return "วันพระ";

  return "ไม่มีวันสำคัญ";
}

// ---------- สีประจำวัน ----------
const dayColors = [
  { name: "สีแดง", emoji: "❤️" },       // อาทิตย์
  { name: "สีเหลือง", emoji: "💛" },   // จันทร์
  { name: "สีชมพู", emoji: "💗" },     // อังคาร
  { name: "สีเขียว", emoji: "💚" },    // พุธ
  { name: "สีส้ม", emoji: "🧡" },      // พฤหัส
  { name: "สีฟ้า", emoji: "💙" },      // ศุกร์
  { name: "สีม่วง", emoji: "💜" }      // เสาร์
];

// ---------- ปฏิทิน ----------
function generateCalendar(date) {
  const now = new Date(date);
  const y = now.getFullYear();
  const be = y + 543;
  const mI = now.getMonth();
  const d = now.getDate();

  const monthNames = [
    "มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
    "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"
  ];

  const weekdayFull = [
    "วันอาทิตย์","วันจันทร์","วันอังคาร","วันพุธ",
    "วันพฤหัสบดี","วันศุกร์","วันเสาร์"
  ];

  const wName = weekdayFull[now.getDay()];
  const mName = monthNames[mI];

  const first = new Date(y, mI, 1);
  const dim = new Date(y, mI + 1, 0).getDate();

  const jsDay = first.getDay();
  const offset = (jsDay + 6) % 7;

  const headers = ["จ","อ","พ","พฤ","ศ","ส","อา"];
  let lines = [];

  lines.push(`${headers.join("  ")}`);

  let cur = 1;
  let row = [];

  for (let i = 0; i < offset; i++) row.push("   ");

  for (let i = offset; i < 7; i++) {
    row.push(cur === d ? fancyNumbers[cur].padStart(2," ") : String(cur).padStart(2," "));
    cur++;
  }

  lines.push(row.join("  "));

  while (cur <= dim) {
    row = [];
    for (let i = 0; i < 7; i++) {
      if (cur > dim) row.push("  ");
      else row.push(cur === d ? fancyNumbers[cur].padStart(2," ") : String(cur).padStart(2," "));
      cur++;
    }
    lines.push(row.join("  "));
  }

  return {
    text: lines.join("\n"),
    weekday: wName,
    month: mName,
    yearBE: be,
    day: d
  };
}

// ---------- ส่ง Embed ----------
async function sendDailyEmbed(channel) {
  const now = new Date();
  const cal = generateCalendar(now);
  const holiday = getThaiHoliday(now);

  const dayColor = dayColors[now.getDay()];

  const embed = new EmbedBuilder()
    .setColor("#FF77FF")
    .setTitle("✨ ปฏิทินไทยประจำวัน ✨")
    .setDescription(
      `วันนี้เป็น **${cal.weekday} ที่ ${cal.day} ${cal.month} พ.ศ. ${cal.yearBE}**\n\n` +
      `🎨 **สีประจำวัน:** ${dayColor.name} ${dayColor.emoji}\n` +
      `📅 **วันนี้:** ${holiday}\n\n` +
      "….::::•°✾°•::::…. ….::::•°✾°•::::…. \n" +
      `**${cal.weekday} ที่ ${cal.day} ${cal.month} พ.ศ. ${cal.yearBE}**\n\n` +
      "```txt\n" + cal.text + "\n```" +
      `🪷 **วันสำคัญวันนี้:** ${holiday}`
    )
    .setImage(
      "https://cdn.discordapp.com/attachments/1443746157082706054/1447963237919227934/Unknown.gif"
    )
    .setFooter({
      text: "𝐂𝐫𝐞𝐝𝐢𝐭 ˏˋ°•⁀ • ➵ 𝐁𝐲 𝐙𝐞𝐦𝐨𝐧 Ź𝐱 | 𝐱𝐒𝐰𝐢𝐟𝐭 𝐇𝐮𝐛 ⋆.ೃ࿔"
    });

  await channel.send({ content: "@everyone", embeds: [embed] });
}

// ---------- Schedule ----------
cron.schedule("0 0 * * *", async () => {
  const channel = await client.channels.fetch(CHANNEL_ID);
  await sendDailyEmbed(channel);
}, { timezone: TIMEZONE });

// ---------- Ready ----------
client.on("ready", async () => {
  console.log(`ล็อกอินเป็น ${client.user.tag} แล้วจ้า`);

  const channel = await client.channels.fetch(CHANNEL_ID);
  await sendDailyEmbed(channel);

  // Auto join voice
  joinVoiceChannel({
    channelId: VOICE_ID,
    guildId: channel.guild.id,
    adapterCreator: channel.guild.voiceAdapterCreator
  });

  console.log("เข้าห้องเสียงเรียบร้อย 💗");
});

// ---------- Login ----------
client.login(TOKEN);
