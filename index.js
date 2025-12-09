// index.js
// Thai Calendar Discord Bot (xSwift Hub edition)

const express = require("express");
const { Client, GatewayIntentBits } = require("discord.js");
const cron = require("node-cron");
const { joinVoiceChannel } = require("@discordjs/voice");
const config = require("./bot_config");

// ---------- Web Server (ให้ Railway ปลุก) ----------
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
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// ใช้เก็บ channel ที่จะส่ง + กันส่งซ้ำ
let targetChannel = null;

// ---------- Helper: เวลาไทย ----------
function getNowInThaiTZ() {
  const tz = config.timezone || "Asia/Bangkok";
  const now = new Date();
  const localString = now.toLocaleString("en-US", { timeZone: tz });
  return new Date(localString);
}

// ---------- Helper: ข้อมูลวัน / สีประจำวัน ----------
const thaiWeekdaysFull = [
  "วันอาทิตย์",
  "วันจันทร์",
  "วันอังคาร",
  "วันพุธ",
  "วันพฤหัสบดี",
  "วันศุกร์",
  "วันเสาร์"
];

const thaiMonths = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม"
];

const weekdayColor = {
  0: { name: "สีแดง", emoji: "❤️" },        // อาทิตย์
  1: { name: "สีเหลือง", emoji: "💛" },     // จันทร์
  2: { name: "สีชมพู", emoji: "💗" },       // อังคาร
  3: { name: "สีเขียว", emoji: "💚" },      // พุธ
  4: { name: "สีส้ม", emoji: "🧡" },        // พฤหัส
  5: { name: "สีฟ้า", emoji: "💙" },        // ศุกร์
  6: { name: "สีม่วง", emoji: "💜" }        // เสาร์
};

// ---------- Helper: วงกลมเลขวัน (➊ … ➌➊ เฉพาะวันนี้) ----------
const circledDigitsMap = {
  "0": "⓿",
  "1": "➊",
  "2": "➋",
  "3": "➌",
  "4": "➍",
  "5": "➎",
  "6": "➏",
  "7": "➐",
  "8": "➑",
  "9": "➒"
};

function toCircledNumber(num) {
  return String(num)
    .split("")
    .map((d) => circledDigitsMap[d] || d)
    .join("");
}

// ---------- Helper: วันสำคัญแบบง่าย ๆ ----------
function getSpecialThaiDayInfo(date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1; // 1-12
  const d = date.getDate();

  const mmdd = `${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  // ตารางตัวอย่าง (เพิ่มเองได้ตามใจเลยน้า)
  const table = {
    "01-01": { text: "วันขึ้นปีใหม่ 🎉" },
    "02-14": { text: "วันวาเลนไทน์ 💌" },
    "04-13": { text: "วันสงกรานต์ 💦 (วันแรก)" },
    "04-14": { text: "วันสงกรานต์ 💦" },
    "04-15": { text: "วันสงกรานต์ 💦 (วันสุดท้าย)" },
    "08-12": { text: "วันแม่แห่งชาติ 💐" },
    "12-05": { text: "วันพ่อแห่งชาติ 👨‍👧‍👦" },
    "12-31": { text: "วันสิ้นปี 🎆" }
  };

  const found = table[mmdd];
  if (found) {
    return found.text;
  }

  // ยังไม่ได้คำนวณวันพระตามจันทรคติจริง ๆ (โหดมาก)
  // ถ้าอยากให้ตรง 100% อนาคตค่อยต่อยอดเพิ่มได้
  return "ไม่มีวันสำคัญ";
}

// ---------- สร้างข้อความปฏิทินแบบ Text ----------
function generateThaiCalendarMessage(dateInThaiTZ = getNowInThaiTZ()) {
  const now = new Date(dateInThaiTZ);

  const year = now.getFullYear();
  const beYear = year + 543;
  const monthIndex = now.getMonth();
  const dayOfMonth = now.getDate();
  const weekdayIndex = now.getDay();

  const weekdayName = thaiWeekdaysFull[weekdayIndex];
  const monthName = thaiMonths[monthIndex];

  const colorInfo = weekdayColor[weekdayIndex];
  const colorLine = `🎨 สีประจำวัน : ${colorInfo.name} ${colorInfo.emoji}`;

  const specialText = getSpecialThaiDayInfo(now);

  // หัวบรรทัด “วันนี้เป็น …”
  const todayLine = `วันนี้เป็น ${weekdayName} ที่ ${dayOfMonth} ${monthName} พ.ศ. ${beYear}`;

  // เส้นคั่นพิเศษ
  const fancyDivider = "….::::•°✾°•::::….….::::•°✾°•::::….";
  const headerDateLine = `${weekdayName} ที่ ${dayOfMonth} ${monthName} พ.ศ. ${beYear}`;

  // --------- สร้างตารางปฏิทินทั้งเดือน (จันทร์-อาทิตย์) ---------
  const firstOfMonth = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  // จัดให้จันทร์เป็นคอลัมน์แรก
  const jsDay = firstOfMonth.getDay(); // 0=อา .. 6=เสาร์
  const offset = (jsDay + 6) % 7; // 0=จันทร์ .. 6=อาทิตย์

  const headers = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];

  let lines = [];

  // header แถววัน
  const headerLine = headers
    .map((h) => h.padStart(2, " ").padEnd(3, " "))
    .join("");
  lines.push(headerLine);

  let currentDay = 1;
  let row = [];

  const todayDay = dayOfMonth;

  // แถวแรก
  for (let i = 0; i < 7; i++) {
    if (i < offset) {
      row.push("   ");
    } else {
      let display = String(currentDay);
      if (currentDay === todayDay) {
        display = toCircledNumber(currentDay); // วงกลมเฉพาะวันนี้
      }
      row.push(display.padStart(2, " ") + " ");
      currentDay++;
    }
  }
  lines.push(row.join(""));

  // แถวถัด ๆ ไป
  while (currentDay <= daysInMonth) {
    row = [];
    for (let i = 0; i < 7; i++) {
      if (currentDay > daysInMonth) {
        row.push("   ");
      } else {
        let display = String(currentDay);
        if (currentDay === todayDay) {
          display = toCircledNumber(currentDay);
        }
        row.push(display.padStart(2, " ") + " ");
        currentDay++;
      }
    }
    lines.push(row.join(""));
  }

  const calendarBlock = lines.join("\n");

  // ---------- ประกอบข้อความทั้งหมด ----------
  const title = "✨ ปฏิทินไทยประจำวัน ✨";

  const message =
    `${title}\n` +
    `${todayLine}\n\n` +
    `${colorLine}\n` +
    `📅 วันนี้ : ${specialText}\n` +
    `${fancyDivider}\n` +
    `${headerDateLine}\n\n` +
    "จ  อ  พ  พฤ  ศ  ส  อา\n" +
    "```txt\n" +
    calendarBlock +
    "\n```" +
    `\n\n🪷 วันสำคัญวันนี้ : ${specialText}`;

  // ไว้ใช้เช็คกันส่งซ้ำ
  const stamp = todayLine;

  return { message, stamp };
}

// ---------- กันส่งซ้ำ: เช็คว่ามีโพสต์ของวันนี้ไปแล้วไหม ----------
async function alreadySentToday(channel, stamp) {
  try {
    const messages = await channel.messages.fetch({ limit: 20 });
    return messages.some(
      (m) => m.author.id === client.user.id && m.content.includes(stamp)
    );
  } catch (err) {
    console.error("เช็คข้อความเก่าล้มเหลว:", err);
    return false;
  }
}

// ---------- ส่งข้อความปฏิทิน + รูป ----------
const IMAGE_URL =
  "https://cdn.discordapp.com/attachments/1443746157082706054/1447963237919227934/Unknown.gif?ex=69398859&is=693836d9&hm=01f3b145e45b6acd4e8c3cb00cba8ed88d9336b058ab70651c2a0e79c7a8d607&";

async function sendDailyCalendar(channel, dateInThaiTZ = getNowInThaiTZ()) {
  const { message, stamp } = generateThaiCalendarMessage(dateInThaiTZ);

  const already = await alreadySentToday(channel, stamp);
  if (already) {
    console.log("วันนี้ส่งปฏิทินไปแล้ว ข้ามการส่งซ้ำ");
    return;
  }

  const fullContent =
    "@everyone\n\n" +
    message +
    "\n\nCredit ˚°·꒰ა By Zemon Źx | xSwift Hub ໒꒱ ·°˚";

  await channel.send({
    content: fullContent,
    files: [{ attachment: IMAGE_URL }]
  });

  console.log("ส่งปฏิทินแล้ว:", dateInThaiTZ.toISOString());
}

// ---------- เข้าห้องเสียง (พร้อมกันล้ม) ----------
function connectToVoice() {
  const voiceChannelId = process.env.VOICE_ID;
  if (!voiceChannelId) {
    console.warn("ไม่ได้ตั้ง VOICE_ID เอาไว้ บอทจะไม่เข้าห้องเสียง");
    return;
  }

  const guild = client.guilds.cache.first();
  if (!guild) {
    console.warn("ไม่พบกิลด์ในแคช บอทอาจยังโหลดไม่เสร็จ");
    return;
  }

  const voiceChannel = guild.channels.cache.get(voiceChannelId);
  if (!voiceChannel || voiceChannel.type !== 2) {
    console.warn("VOICE_ID ไม่ใช่ห้องเสียง หรือหาไม่เจอ");
    return;
  }

  try {
    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator
    });

    connection.on("error", (err) => {
      console.error("Voice connection error (จะไม่ทำให้บอทล้ม):", err.message);
      try {
        connection.destroy();
      } catch (_) {}
    });

    console.log("เข้าห้องเสียงเรียบร้อย 💗");
  } catch (err) {
    console.error("เข้าห้องเสียงไม่สำเร็จ:", err);
  }
}

// ---------- ตั้ง schedule ยิงทุกวันเวลา 00:00 ----------
function scheduleDailyJob() {
  cron.schedule(
    "0 0 * * *",
    async () => {
      try {
        if (!targetChannel) {
          const ch = await client.channels.fetch(config.channelId);
          targetChannel = ch || null;
        }
        if (!targetChannel) {
          console.error("schedule: หา channel ไม่เจอ ข้ามไปก่อน");
          return;
        }

        const nowThai = getNowInThaiTZ();
        await sendDailyCalendar(targetChannel, nowThai);
      } catch (err) {
        console.error("schedule ยิงปฏิทินล้มเหลว:", err);
      }
    },
    {
      timezone: config.timezone || "Asia/Bangkok"
    }
  );
}

// ---------- event: clientReady ----------
client.once("clientReady", async () => {
  console.log(`ล็อกอินเป็น ${client.user.tag} แล้วจ้า`);

  try {
    const channel = await client.channels.fetch(config.channelId);
    if (!channel) {
      console.error("ไม่พบ channel ตาม channelId ที่ตั้งไว้");
    } else {
      targetChannel = channel;

      // ส่งครั้งแรกตอนบอทเพิ่งออนไลน์ (แต่เช็คกันส่งซ้ำแล้ว)
      const nowThai = getNowInThaiTZ();
      await sendDailyCalendar(channel, nowThai);
    }
  } catch (err) {
    console.error("ตอนเริ่มต้นส่งปฏิทินล้มเหลว:", err);
  }

  // ต่อเสียง (แต่มี try/catch + listener ป้องกันล้ม)
  connectToVoice();

  // ตั้ง cron ยิงทุกวัน 00:00 เวลาไทย
  scheduleDailyJob();
});

// ---------- login ----------
client.login(config.token);
