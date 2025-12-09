// index.js

// --------------------- Web / Keep Alive ---------------------
const express = require("express");
const app = express();
const port = process.env.PORT || 8080;

app.get("/", (req, res) => {
  res.send("Thai Calendar Discord Bot is alive ✅");
});

app.listen(port, () => {
  console.log(`Web server running on port ${port}`);
});

// --------------------- Discord Bot ---------------------
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
} = require("discord.js");

const {
  joinVoiceChannel,
  entersState,
  VoiceConnectionStatus,
} = require("@discordjs/voice");

const cron = require("node-cron");
const config = require("./bot_config");

// intents เอาไว้อ่านช่อง / เข้ากิลด์ / อ่านข้อความตัวเอง
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
});

// --------------------- Utils เวลาไทย ---------------------

// คืนค่า Date ตามโซนเวลาไทย (Asia/Bangkok)
function getBangkokDate() {
  const tz = config.timezone || "Asia/Bangkok";
  const now = new Date();
  const str = now.toLocaleString("en-US", { timeZone: tz });
  return new Date(str);
}

// แปลงเป็น key ไว้กันส่งซ้ำ เช่น 2025-12-10
function getDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// --------------------- ข้อมูลวัน / สี / วันสำคัญ ---------------------

const thaiWeekdaysFull = [
  "วันอาทิตย์",
  "วันจันทร์",
  "วันอังคาร",
  "วันพุธ",
  "วันพฤหัสบดี",
  "วันศุกร์",
  "วันเสาร์",
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
  "ธันวาคม",
];

// สีประจำวันแบบง่าย ๆ
const colorOfDay = {
  0: { text: "สีแดง", emoji: "❤️" },   // อาทิตย์
  1: { text: "สีเหลือง", emoji: "💛" }, // จันทร์
  2: { text: "สีชมพู", emoji: "💗" },   // อังคาร
  3: { text: "สีเขียว", emoji: "💚" },  // พุธ
  4: { text: "สีส้ม", emoji: "🧡" },    // พฤหัส
  5: { text: "สีฟ้า", emoji: "💙" },    // ศุกร์
  6: { text: "สีม่วง", emoji: "💜" },   // เสาร์
};

// ฟังก์ชันเช็ควันสำคัญ (ตัวอย่างไม่ครบทุกวันในปฏิทินไทยนะ แต่ใช้หลัก ๆ ก่อน)
// ถ้าอยากเพิ่มก็มาเติมในนี้ได้เลย
function getThaiSpecialDay(date) {
  const d = date.getDate();
  const m = date.getMonth() + 1;

  // ตัวอย่าง: สงกรานต์
  if (m === 4 && d >= 13 && d <= 15) return "เทศกาลสงกรานต์ 🌊💦";

  // ตัวอย่าง: ปีใหม่
  if (m === 1 && d === 1) return "วันขึ้นปีใหม่ 🎉";

  // ตัวอย่างวันแม่/วันพ่อ
  if (m === 8 && d === 12) return "วันแม่แห่งชาติ 🤍";
  if (m === 12 && d === 5) return "วันพ่อแห่งชาติ 💛";

  // TODO: วันพระจริง ๆ ต้องใช้ปฏิทินจันทรคติ (ค่อนข้างยาว)
  // ตรงนี้เลยทำเป็น placeholder ธรรมดาไปก่อน
  // ถ้าวันไหนอยากกำหนดวันพระเองก็เพิ่มเงื่อนไขด้านบนได้
  return null; // ไม่มีวันสำคัญ
}

// --------------------- สร้างข้อความปฏิทิน ---------------------

// แปลงเลข 1-31 -> ➊-➌➊
const circleNumbers = [
  "➊","➋","➌","➍","➎","➏","➐","➑","➒",
  "➓","➊➊","➊➋","➊➌","➊➍","➊➎","➊➏","➊➐","➊➑","➊➒",
  "➋๐","➋➊","➋➋","➋➌","➋➍","➋➎","➋➏","➋➐","➋➑","➋➒","➌➓"
];

function highlightDay(number) {
  if (number >= 1 && number <= 31) {
    return circleNumbers[number - 1];
  }
  return String(number);
}

function generateCalendarBlock(date) {
  const year = date.getFullYear();
  const beYear = year + 543;
  const monthIndex = date.getMonth();
  const dayOfMonth = date.getDate();
  const weekdayIndex = date.getDay();

  const monthName = thaiMonths[monthIndex];
  const weekdayName = thaiWeekdaysFull[weekdayIndex];

  const firstOfMonth = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  // เปลี่ยนให้จันทร์เป็นคอลัมน์แรก
  const jsDay = firstOfMonth.getDay();        // 0..6 (อา..ส)
  const offset = (jsDay + 6) % 7;             // 0..6 (จ..อา)

  const headers = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];
  const lines = [];

  // หัวข้อวันที่
  lines.push(`${weekdayName} ที่ ${dayOfMonth} ${monthName} พ.ศ. ${beYear}`);
  lines.push(""); // เว้นบรรทัด

  // header ตารางแบบรูปที่ 2
  const headerLine = headers
    .map((h) => h.padStart(2, " ").padEnd(3, " "))
    .join("");
  lines.push(headerLine);

  let currentDay = 1;
  let row = [];

  // แถวแรก: เติมช่องว่างก่อนถึงวันที่ 1
  for (let i = 0; i < 7; i++) {
    if (i < offset) {
      row.push("   ");
    } else {
      const text =
        currentDay === dayOfMonth
          ? highlightDay(currentDay) // ตัววันที่วันนี้ใช้เลขวงกลม
          : String(currentDay);
      row.push(text.toString().padStart(2, " ") + " ");
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
        const text =
          currentDay === dayOfMonth
            ? highlightDay(currentDay)
            : String(currentDay);
        row.push(text.toString().padStart(2, " ") + " ");
        currentDay++;
      }
    }
    lines.push(row.join(""));
  }

  return {
    calendarText: lines.join("\n"),
    weekdayName,
    monthName,
    beYear,
    dayOfMonth,
  };
}

// --------------------- สร้าง Embed สวย ๆ ---------------------

function buildCalendarEmbed(date) {
  const {
    calendarText,
    weekdayName,
    monthName,
    beYear,
    dayOfMonth,
  } = generateCalendarBlock(date);

  const weekdayIndex = date.getDay();
  const colorInfo = colorOfDay[weekdayIndex] || {
    text: "ไม่ทราบสีประจำวัน",
    emoji: "🎨",
  };

  const special = getThaiSpecialDay(date);
  const specialText = special || "ไม่มีวันสำคัญ";

  const title = "✨ ปฏิทินไทยประจำวัน | xSwift Hub✨";
  const subtitle = `วันนี้ ☀️ ${weekdayName} ที่ ${dayOfMonth} ${monthName} พ.ศ. ${beYear}`;

  const decoLine = "๐•°❀°•๐━━━━━━๐•°❀°•๐•°❀°•๐━━━━━━๐•°❀°•๐•°❀°•๐━━━━━━๐•°❀°•๐";

  const topLines = [
    title,
    subtitle,
    "",
    `🎨 สีประจำวัน : ${colorInfo.text} ${colorInfo.emoji}`,
    `📅 วันนี้ : ${special ? special : "ไม่มีวันสำคัญ"}`,
    decoLine,
    "",
  ];

  const calendarBlock =
    "```txt\n" +
    "จ  อ  พ  พฤ ศ  ส  อา\n" + // บังคับให้เรียงแบบรูปที่ 2
    calendarText
      .split("\n")
      .slice(2) // ตัดหัวบรรทัดที่เป็น "วัน..." กับบรรทัดว่างออก
      .join("\n") +
    "\n```";

  const bottomLines = [
    "",
    `🌸 วันสำคัญวันนี้ : ${specialText}`,
    "",
  ];

  const description =
    topLines.join("\n") + calendarBlock + bottomLines.join("\n");

  const imageUrl =
    "https://cdn.discordapp.com/attachments/1443746157082706054/1447963237919227934/Unknown.gif?ex=69398859&is=693836d9&hm=01f3b145e45b6acd4e8c3cb00cba8ed88d9336b058ab70651c2a0e79c7a8d607&";

  const embed = new EmbedBuilder()
    .setColor(0xff66cc)
    .setDescription(description)
    .setImage(imageUrl)
    .setFooter({
      text:
        "Credit ˚₊· ͟͟͞͞➳❥ By Zemon Źx | xSwift Hub",
    });

  return embed;
}

// --------------------- ส่งข้อความประจำวัน ---------------------

let lastSentDateKey = null;

async function sendDailyCalendarIfNeeded(reason = "schedule") {
  try {
    const channelId = config.channelId;
    const channel = await client.channels.fetch(channelId);
    if (!channel) {
      console.error("ไม่พบ channel ตาม channelId ที่ตั้งไว้");
      return;
    }

    const now = getBangkokDate();
    const todayKey = getDateKey(now);

    // กันส่งซ้ำในโปรเซสเดียวกัน
    if (lastSentDateKey === todayKey) {
      console.log("วันนี้ส่งปฏิทินไปแล้ว ข้ามจ้า");
      return;
    }

    lastSentDateKey = todayKey;

    const embed = buildCalendarEmbed(now);

    await channel.send({
      content: "@everyone",
      embeds: [embed],
    });

    console.log(`ส่งปฏิทินแล้ว (${reason}) :`, todayKey);
  } catch (err) {
    console.error("ส่งปฏิทินล้มเหลว:", err);
  }
}

// --------------------- Schedule 00:00 ทุกวัน ---------------------

function scheduleDailyCalendar() {
  cron.schedule(
    "0 0 * * *",
    async () => {
      await sendDailyCalendarIfNeeded("cron 00:00");
    },
    {
      timezone: config.timezone || "Asia/Bangkok",
    }
  );
}

// --------------------- เข้าห้องเสียง ---------------------

async function connectToVoiceOnReady() {
  const voiceId = process.env.VOICE_ID;
  if (!voiceId) {
    console.warn("ไม่ได้ตั้งค่า VOICE_ID ข้ามการเข้าห้องเสียง");
    return;
  }

  try {
    const channel = await client.channels.fetch(voiceId);
    if (!channel || !channel.isVoiceBased()) {
      console.warn("VOICE_ID ไม่ใช่ห้องเสียง หรือหาไม่เจอ");
      return;
    }

    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: true,
      selfMute: false,
    });

    connection.on("error", (err) => {
      console.error("Voice connection error (แต่จะไม่ให้บอทล้ม):", err);
    });

    await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
    console.log("เข้าห้องเสียงเรียบร้อย 💗");
  } catch (err) {
    // ถ้าเจอ error แบบ No compatible encryption modes จะมาลงตรงนี้
    console.error("เข้าห้องเสียงไม่สำเร็จ (จับ error ไว้ไม่ให้บอทดับ):", err);
  }
}

// --------------------- Ready / Login ---------------------

client.once("ready", async () => {
  console.log(`ล็อกอินเป็น ${client.user.tag} แล้วจ้า`);

  // เข้าห้องเสียง 1 ครั้งตอนออนไลน์
  await connectToVoiceOnReady();

  // ส่งปฏิทินทันทีตอนบอทออนไลน์ (วันนั้น 1 ครั้ง)
  await sendDailyCalendarIfNeeded("ready");

  // ตั้ง schedule ให้ยิงทุกวัน 00:00
  scheduleDailyCalendar();
});

client.login(config.token);
