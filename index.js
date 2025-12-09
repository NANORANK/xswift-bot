// ==========================
//  Thai Calendar Bot | xSwift Hub
//  By Zemon Źx 💗
// ==========================

const express = require("express");
const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const cron = require("node-cron");
const config = require("./bot_config");

// ---------- Web Server (กัน Sleep) ----------
const app = express();
const port = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Thai Calendar Discord Bot is alive ✅");
});

app.listen(port, () => {
  console.log(`Web server running on port ${port}`);
});

// ---------- Discord Client ----------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// ---------- สีประจำวัน ----------
const dayColors = {
  "วันอาทิตย์": { text: "สีแดง ❤️", embed: 0xff4d4d },
  "วันจันทร์": { text: "สีเหลือง 💛", embed: 0xffeb3b },
  "วันอังคาร": { text: "สีชมพู 💗", embed: 0xff80c8 },
  "วันพุธ": { text: "สีเขียว 💚", embed: 0x00c853 },
  "วันพฤหัสบดี": { text: "สีส้ม 🧡", embed: 0xffa726 },
  "วันศุกร์": { text: "สีฟ้า 💙", embed: 0x42a5f5 },
  "วันเสาร์": { text: "สีม่วง 💜", embed: 0xba68c8 }
};

// ---------- วันสำคัญไทยแบบง่าย ----------
function getThaiHoliday(date) {
  const d = date.getDate();
  const m = date.getMonth() + 1;

  // ตัวอย่างวันสำคัญ
  if (d === 13 && m === 4) return "วันสงกรานต์ 💦";
  if (d === 14 && m === 2) return "วันวาเลนไทน์ ❤️";
  if (d === 1 && m === 1) return "วันขึ้นปีใหม่ 🎉";

  // วันพระแบบง่าย (ทุกวันขึ้น/แรม 8 ค่ำ + 15 ค่ำ)
  const moon = d % 7;
  if (moon === 1) return "วันพระ 🙏";

  return "ไม่มีวันสำคัญใด ๆ 💬";
}

// ---------- เลขพิเศษเฉพาะวันปัจจุบัน ----------
const specialNumbers = {
  1: "➊",  2: "➋",  3: "➌",  4: "➍",  5: "➎",
  6: "➏",  7: "➐",  8: "➑",  9: "➒",  10: "➓",
  11: "⓫", 12: "⓬", 13: "⓭", 14: "⓮", 15: "⓯",
  16: "⓰", 17: "⓱", 18: "⓲", 19: "⓳", 20: "⓴",
  21: "➀", 22: "➁", 23: "➂", 24: "➃", 25: "➄",
  26: "➅", 27: "➆", 28: "➇", 29: "➈", 30: "➉",
  31: "➌➊"
};

// ---------- ฟังก์ชันสร้างตารางปฏิทิน ----------
function generateCalendar(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const today = date.getDate();

  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const offset = (first.getDay() + 6) % 7;
  const headers = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];

  let lines = [];

  lines.push(" จ  อ  พ  พฤ  ศ  ส  อา");

  let row = [];
  for (let i = 0; i < offset; i++) row.push("   ");

  for (let d = 1; d <= daysInMonth; d++) {
    let display = d === today ? specialNumbers[d] : d.toString();
    display = display.toString().padStart(2, " ");

    row.push(display + " ");

    if (row.length === 7) {
      lines.push(row.join(""));
      row = [];
    }
  }
  if (row.length > 0) lines.push(row.join(""));

  return lines.join("\n");
}

// ---------- ฟังก์ชันสร้าง Embed ----------
function createDailyEmbed(date) {
  const thaiMonths = [
    "มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
    "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"
  ];
  const thaiDays = [
    "วันอาทิตย์","วันจันทร์","วันอังคาร","วันพุธ",
    "วันพฤหัสบดี","วันศุกร์","วันเสาร์"
  ];

  const y = date.getFullYear();
  const be = y + 543;
  const m = date.getMonth();
  const d = date.getDate();
  const weekday = thaiDays[date.getDay()];
  const monthName = thaiMonths[m];

  const colorData = dayColors[weekday];
  const holiday = getThaiHoliday(date);
  const cal = generateCalendar(date);

  return new EmbedBuilder()
    .setColor(colorData.embed)
    .setTitle("✨ ปฏิทินไทยประจำวัน ✨")
    .setDescription(
`วันนี้เป็น **${weekday}** ที่ **${d} ${monthName} พ.ศ. ${be}**

🎨 **สีประจำวัน : ${colorData.text}**  
📅 **วันนี้ : ${holiday}**

….::::•°✾°•::::….….::::•°✾°•::::….

**${weekday} ที่ ${d} ${monthName} พ.ศ. ${be}**

\`\`\`txt
${cal}
\`\`\`

🪷 **วันสำคัญวันนี้ : ${holiday}**
`
    )
    .setImage("https://cdn.discordapp.com/attachments/1443746157082706054/1447963237919227934/Unknown.gif")
    .setFooter({
      text: "𝐂𝐫𝐞𝐝𝐢𝐭 ˏˋ°•⁀ • ➵ 𝐁𝐲 𝐙𝐞𝐦𝐨𝐧 Ź𝐱 | 𝐱𝐒𝐰𝐢𝐟𝐭 𝐇𝐮𝐛 ⋆.ೃ࿔"
    });
}

// ---------- กันส่งซ้ำตอนบอทรีสตาร์ท ----------
let lastSentDate = null;

// ---------- Schedule 00:00 ----------
function scheduleDaily() {
  cron.schedule(
    "0 0 * * *",
    async () => {
      try {
        const now = new Date();
        const dateKey = now.toDateString();

        if (dateKey === lastSentDate) return;

        lastSentDate = dateKey;

        const channel = await client.channels.fetch(config.channelId);
        if (!channel) return console.error("❌ channelId ไม่ถูกต้อง");

        const embed = createDailyEmbed(now);
        await channel.send({ content: "@everyone", embeds: [embed] });

        console.log("🎉 ส่งปฏิทินแล้ว:", now.toISOString());
      } catch (err) {
        console.error("❌ ส่งปฏิทินล้มเหลว:", err);
      }
    },
    { timezone: config.timezone || "Asia/Bangkok" }
  );
}

// ---------- Event Ready ----------
client.once("ready", async () => {
  console.log(`ล็อกอินเป็น ${client.user.tag} แล้วจ้า`);

  // เข้าห้องเสียงทันที
  try {
    const voice = await client.channels.fetch(process.env.VOICE_ID);
    if (voice?.join) await voice.join();
  } catch (e) {
    console.log("เข้าห้องเสียงไม่ได้ แต่ไม่เป็นไร:", e.message);
  }

  // ส่งครั้งเดียวถ้ายังไม่ได้ส่งวันนี้
  const now = new Date();
  if (now.toDateString() !== lastSentDate) {
    const channel = await client.channels.fetch(config.channelId);
    const embed = createDailyEmbed(now);
    await channel.send({ content: "@everyone", embeds: [embed] });
    lastSentDate = now.toDateString();
  }

  scheduleDaily();
});

// ---------- Login ----------
client.login(config.token);
