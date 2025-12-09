// index.js - MASTER ULTRA VERSION (xSwift Hub | By Zemon Źx)
// ------------------------------------------------------------
//  WEB SERVER (KEEP ALIVE)
// ------------------------------------------------------------
const express = require("express");
const app = express();
const port = process.env.PORT || 8080;

app.get("/", (req, res) => {
  res.send("Thai Calendar Bot is Alive 💗");
});
app.listen(port, () => console.log("Web server running on port", port));

// ------------------------------------------------------------
//  IMPORTS
// ------------------------------------------------------------
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder
} = require("discord.js");

const {
  joinVoiceChannel,
  entersState,
  VoiceConnectionStatus
} = require("@discordjs/voice");

const cron = require("node-cron");
const config = require("./bot_config");

// ------------------------------------------------------------
//  CLIENT
// ------------------------------------------------------------
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

// ------------------------------------------------------------
//  TIMEZONE (THAI)
// ------------------------------------------------------------
function getThaiDate() {
  const now = new Date();
  const local = now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" });
  return new Date(local);
}

function keyDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

// ------------------------------------------------------------
//  THAI NAMES
// ------------------------------------------------------------
const thaiWeekdays = [
  "วันอาทิตย์", "วันจันทร์", "วันอังคาร",
  "วันพุธ", "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์"
];

const thaiMonths = [
  "มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
  "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"
];

// ------------------------------------------------------------
//  COLORS OF WEEKDAY
// ------------------------------------------------------------
const colorOfDay = {
  0: { name: "สีแดง", emoji: "❤️" },
  1: { name: "สีเหลือง", emoji: "💛" },
  2: { name: "สีชมพู", emoji: "💗" },
  3: { name: "สีเขียว", emoji: "💚" },
  4: { name: "สีส้ม", emoji: "🧡" },
  5: { name: "สีฟ้า", emoji: "💙" },
  6: { name: "สีม่วง", emoji: "💜" }
};

// ------------------------------------------------------------
//  CIRCLED NUMBERS (➊➋➌…)
// ------------------------------------------------------------
const circleNum = [
  "➊","➋","➌","➍","➎","➏","➐","➑","➒",
  "➓","➊➊","➊➋","➊➌","➊➍","➊➎","➊➏",
  "➊➐","➊➑","➊➒","➋➓","➋➊","➋➋","➋➌",
  "➋➍","➋➎","➋➏","➋➐","➋➑","➋➒","➌➓"
];

function circle(n) {
  return n >= 1 && n <= 31 ? circleNum[n - 1] : `${n}`;
}

// ------------------------------------------------------------
//  THAI FESTIVAL SYSTEM (UPGRADED)
// ------------------------------------------------------------

// วันพระ (ง่าย) — ขึ้น/แรม 8,15,22,29
function isWanPra(d) {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const diff = Math.floor((d - start) / 86400000) + 1;
  return [8, 15, 22, 29].includes(diff);
}

// ⭐ วันโกน = วันก่อนวันพระ
function isWanKon(d) {
  const tomorrow = new Date(d);
  tomorrow.setDate(d.getDate() + 1);
  return isWanPra(tomorrow);
}

// ตรุษจีน (กำหนดปี)
function chineseNewYear(y) {
  const data = {
    2024: "2024-02-10",
    2025: "2025-01-29",
    2026: "2026-02-17"
  };
  return data[y] || null;
}

// วันพุทธศาสนาใหญ่ (2024–2026)
const buddhistDays = {
  2024: {
    makha: "2024-02-24",
    visakha: "2024-05-22",
    asarnha: "2024-07-20",
    khao: "2024-07-21",
    ok: "2024-10-17"
  },
  2025: {
    makha: "2025-02-12",
    visakha: "2025-05-11",
    asarnha: "2025-07-10",
    khao: "2025-07-11",
    ok: "2025-10-06"
  },
  2026: {
    makha: "2026-03-03",
    visakha: "2026-05-31",
    asarnha: "2026-07-29",
    khao: "2026-07-30",
    ok: "2026-11-05"
  }
};

// รวมวันสำคัญไทยแบบละเอียด
function getSpecialThaiDays(d) {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const dd = d.getDate();
  const key = keyDate(d);

  let list = [];

  // วันโกนก่อนวันพระ
  if (isWanKon(d)) list.push("🌕 วันโกน");

  // วันพระ
  if (isWanPra(d)) list.push("🪷 วันพระ");

  // ตรุษจีน
  if (chineseNewYear(y) === key) list.push("🧧 ตรุษจีน");

  // ลอยกระทง
  if (m === 11 && dd === 15) list.push("🏮 ลอยกระทง");

  // สงกรานต์
  if (m === 4 && dd >= 13 && dd <= 15) list.push("💦 สงกรานต์");

  // วันสำคัญคงที่
  const fixed = {
    "01-01": "🎉 วันขึ้นปีใหม่",
    "02-14": "💘 วันวาเลนไทน์",
    "05-01": "🔧 วันแรงงาน",
    "08-12": "💙 วันแม่แห่งชาติ",
    "12-05": "💛 วันพ่อแห่งชาติ",
    "12-10": "📜 วันรัฐธรรมนูญ",
    "12-25": "🎄 คริสต์มาส",
    "10-31": "🎃 ฮาโลวีน"
  };
  const mmdd = `${String(m).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  if (fixed[mmdd]) list.push(fixed[mmdd]);

  // วันพุทธศาสนาใหญ่
  const bd = buddhistDays[y];
  if (bd) {
    if (key === bd.makha) list.push("🪔 วันมาฆบูชา");
    if (key === bd.visakha) list.push("🕊 วันวิสาขบูชา");
    if (key === bd.asarnha) list.push("✨ วันอาสาฬหบูชา");
    if (key === bd.khao) list.push("🙏 วันเข้าพรรษา");
    if (key === bd.ok) list.push("📿 วันออกพรรษา");
  }

  return list.length ? list : ["🌸 ไม่มีวันสำคัญ"];
}

// ------------------------------------------------------------
//  CALENDAR GENERATOR
// ------------------------------------------------------------
function generateCalendar(date) {
  const y = date.getFullYear();
  const be = y + 543;
  const m = date.getMonth();
  const d = date.getDate();
  const weekdayName = thaiWeekdays[date.getDay()];
  const monthName = thaiMonths[m];

  const first = new Date(y, m, 1);
  const days = new Date(y, m + 1, 0).getDate();

  const offset = (first.getDay() + 6) % 7;

  let lines = [];
  lines.push("จ  อ  พ  พฤ ศ  ส  อา");

  let row = [];
  let cur = 1;

  for (let i = 0; i < 7; i++) {
    if (i < offset) row.push("   ");
    else {
      row.push((cur === d ? circle(cur) : `${cur}`).padStart(2, " ") + " ");
      cur++;
    }
  }
  lines.push(row.join(""));

  while (cur <= days) {
    row = [];
    for (let i = 0; i < 7; i++) {
      if (cur > days) row.push("   ");
      else {
        row.push((cur === d ? circle(cur) : `${cur}`).padStart(2, " ") + " ");
        cur++;
      }
    }
    lines.push(row.join(""));
  }

  return {
    weekdayName,
    monthName,
    be,
    day: d,
    text: lines.join("\n")
  };
}

// ------------------------------------------------------------
//  EMBED BUILDER
// ------------------------------------------------------------
const IMAGE_URL =
  "https://cdn.discordapp.com/attachments/1443746157082706054/1447963237919227934/Unknown.gif";

function buildEmbed(date) {
  const cal = generateCalendar(date);
  const color = colorOfDay[date.getDay()];
  const specials = getSpecialThaiDays(date);
  const specialsLine = specials.join(" • ");

  const header =
    `✨ ปฏิทินไทยประจำวัน ✨\n` +
    `วันนี้เป็น ${cal.weekdayName} ที่ ${cal.day} ${cal.monthName} พ.ศ. ${cal.be}\n\n` +
    `🎨 สีประจำวัน : ${color.name} ${color.emoji}\n` +
    `📅 วันนี้ : ${specialsLine}\n` +
    `….::::•°✾°•::::….….::::•°✾°•::::….\n`;

  const combined = header + "```txt\n" + cal.text + "\n```\n" +
    `🪷 วันสำคัญวันนี้ : ${specialsLine}`;

  return new EmbedBuilder()
    .setColor(0xff66cc)
    .setDescription(combined)
    .setImage(IMAGE_URL)
    .setFooter({
      text: "Credit ˚₊· ͟͟͞͞➳❥ By Zemon Źx | xSwift Hub"
    });
}

// ------------------------------------------------------------
//  SEND DAILY w/ NO DUPLICATES
// ------------------------------------------------------------
let lastSent = null;

async function sendDaily(reason) {
  try {
    const ch = await client.channels.fetch(config.channelId);
    const now = getThaiDate();
    const today = keyDate(now);

    if (lastSent === today) return;
    lastSent = today;

    await ch.send({ content: "@everyone", embeds: [buildEmbed(now)] });

    console.log("ส่งปฏิทินแล้ว:", today, "|", reason);
  } catch (e) {
    console.error("ส่งปฏิทินผิดพลาด:", e);
  }
}

// ------------------------------------------------------------
//  VOICE SYSTEM
// ------------------------------------------------------------
async function connectVoice() {
  const id = process.env.VOICE_ID;
  if (!id) return;

  try {
    const ch = await client.channels.fetch(id);
    if (!ch.isVoiceBased()) return;

    const conn = joinVoiceChannel({
      channelId: ch.id,
      guildId: ch.guild.id,
      adapterCreator: ch.guild.voiceAdapterCreator,
      selfDeaf: true
    });

    conn.on("error", err => console.log("VOICE ERROR:", err.message));

    await entersState(conn, VoiceConnectionStatus.Ready, 15000);
    console.log("เข้าห้องเสียงสำเร็จ 💗");
  } catch (e) {
    console.log("เข้าห้องเสียงล้มเหลว:", e.message);
  }
}

// ------------------------------------------------------------
//  READY
// ------------------------------------------------------------
client.once("ready", async () => {
  console.log("ล็อกอินเป็น", client.user.tag, "แล้วจ้า 💗");

  await connectVoice();
  await sendDaily("on-ready");

  cron.schedule("0 0 * * *", () => sendDaily("cron-00:00"), {
    timezone: "Asia/Bangkok"
  });
});

client.login(config.token);
