// index.js - MASTER ULTRA VERSION (Reaction-role system removed, + Welcome Ultra)
// (xSwift Hub | By Zemon Źx)
// ------------------------------------------------------------

const express = require("express");
const app = express();
const port = process.env.PORT || 8080;

app.get("/", (req, res) => res.send("Thai Calendar Bot is Alive 💗"));
app.listen(port, () => console.log("Web server running on port", port));

const fs = require("fs");
const path = require("path");

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  SlashCommandBuilder,
  REST,
  Routes,
  StringSelectMenuBuilder,
  ChannelType
} = require("discord.js");

const {
  joinVoiceChannel,
  entersState,
  VoiceConnectionStatus,
  getVoiceConnection
} = require("@discordjs/voice");

const cron = require("node-cron");
const config = require("./bot_config");
const guildStore = require("./guild_store");

// NOTE: partials kept for other handlers if needed
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent
  ],
  partials: ["MESSAGE", "CHANNEL", "USER", "GUILD_MEMBER"]
});

/////////////////////////////////////////////////////////////////
// UTIL / HELPERS
/////////////////////////////////////////////////////////////////
function getThaiDate() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: config.timezone || "Asia/Bangkok" })
  );
}

function keyDate(d) {
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

function formatDurationMs(ms) {
  if (!ms || ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  const days = Math.floor(s / (3600 * 24));
  const hours = Math.floor((s % (3600 * 24)) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  if (days > 0) return `${days} วัน ${hours} ชั่วโมง`;
  if (hours > 0) return `${hours} ชั่วโมง ${minutes} นาที`;
  if (minutes > 0) return `${minutes} นาที`;
  return `${s} วินาที`;
}

function accountAgeText(createdAt) {
  const now = Date.now();
  const ms = now - createdAt;
  return formatDurationMs(ms);
}

function isSuspiciousAccount(createdAt, thresholdDays = 7) {
  const now = Date.now();
  const ms = now - createdAt;
  const days = ms / (1000 * 3600 * 24);
  return days < thresholdDays;
}

/////////////////////////////////////////////////////////////////
// Names / Calendar / Existing features (kept as-is)
/////////////////////////////////////////////////////////////////
const thaiWeekdays = [
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

const colorOfDay = {
  0: { name: "สีแดง", emoji: "❤️" },
  1: { name: "สีเหลือง", emoji: "💛" },
  2: { name: "สีชมพู", emoji: "💗" },
  3: { name: "สีเขียว", emoji: "💚" },
  4: { name: "สีส้ม", emoji: "🧡" },
  5: { name: "สีฟ้า", emoji: "💙" },
  6: { name: "สีม่วง", emoji: "💜" }
};

const circleNum = [
  "➊","➋","➌","➍","➎","➏","➐","➑","➒","➓","➊➊","➊➋","➊➌","➊➍","➊➎","➊➏","➊➐","➊➑","➊➒","➋➓","➋➊","➋➋","➋➌","➋➍","➋➎","➋➏","➋➐","➋➑","➋➒","➌➓"
];
const circle = (n) => (n >= 1 && n <= 31 ? circleNum[n - 1] : String(n));

function isWanPra(d) {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const diff = Math.floor((d - start) / 86400000) + 1;
  return [8, 15, 22, 29].includes(diff);
}

function isWanKon(d) {
  const t = new Date(d);
  t.setDate(d.getDate() + 1);
  return isWanPra(t);
}

function chineseNewYear(y) {
  const map = {
    2024: "2024-02-10",
    2025: "2025-01-29",
    2026: "2026-02-17"
  };
  return map[y] || null;
}

const buddhistDays = {
  2024: { makha: "2024-02-24", visakha: "2024-05-22", asarnha: "2024-07-20", khao: "2024-07-21", ok: "2024-10-17" },
  2025: { makha: "2025-02-12", visakha: "2025-05-11", asarnha: "2025-07-10", khao: "2025-07-11", ok: "2025-10-06" },
  2026: { makha: "2026-03-03", visakha: "2026-05-31", asarnha: "2026-07-29", khao: "2026-07-30", ok: "2026-11-05" }
};

function getSpecialThaiDays(d) {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const dd = d.getDate();
  const key = keyDate(d);

  let list = [];
  if (isWanKon(d)) list.push("🌕 วันโกน");
  if (isWanPra(d)) list.push("🪷 วันพระ");
  if (chineseNewYear(y) === key) list.push("🧧 ตรุษจีน");
  if (m === 11 && dd === 15) list.push("🏮 ลอยกระทง");
  if (m === 4 && dd >= 13 && dd <= 15) list.push("💦 สงกรานต์");

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
  const mmdd = String(m).padStart(2, "0") + "-" + String(dd).padStart(2, "0");
  if (fixed[mmdd]) list.push(fixed[mmdd]);

  const bd = buddhistDays[y];
  if (bd) {
    if (bd.makha === key) list.push("🪔 วันมาฆบูชา");
    if (bd.visakha === key) list.push("🕊 วันวิสาขบูชา");
    if (bd.asarnha === key) list.push("✨ วันอาสาฬหบูชา");
    if (bd.khao === key) list.push("🙏 วันเข้าพรรษา");
    if (bd.ok === key) list.push("📿 วันออกพรรษา");
  }

  return list.length ? list : ["🌸 ไม่มีวันสำคัญ"];
}

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
    if (i < offset) {
      row.push("   ");
    } else {
      row.push((cur === d ? circle(cur) : String(cur)).padStart(2, " ") + " ");
      cur++;
    }
  }
  lines.push(row.join(""));

  while (cur <= days) {
    row = [];
    for (let i = 0; i < 7; i++) {
      if (cur > days) row.push("   ");
      else {
        row.push((cur === d ? circle(cur) : String(cur)).padStart(2, " ") + " ");
        cur++;
      }
    }
    lines.push(row.join(""));
  }

  return { weekdayName, monthName, be, day: d, text: lines.join("\n") };
}

const IMAGE_URL = "https://cdn.discordapp.com/attachments/1443746157082706054/1447963237919227934/Unknown.gif";

function buildEmbed(date) {
  const cal = generateCalendar(date);
  const color = colorOfDay[date.getDay()];
  const specials = getSpecialThaiDays(date).join(" • ");

  const header = `✨ ปฏิทินไทยประจำวัน ✨
วันนี้เป็น ${cal.weekdayName} ที่ ${cal.day} ${cal.monthName} พ.ศ. ${cal.be}

🎨 สีประจำวัน : ${color.name} ${color.emoji}
📅 วันนี้ : ${specials}
….::::•°✾°•::::….….::::•°✾°•::::….
`;

  return new EmbedBuilder()
    .setColor(0xff66cc)
    .setDescription(header + "```txt\n" + cal.text + "\n```\n🪷 วันสำคัญวันนี้ : " + specials)
    .setImage(IMAGE_URL)
    .setFooter({ text: "Credit ˚₊·➳❥ By Zemon Źx | xSwift Hub" });
}

/////////////////////////////////////////////////////////////////
// DAILY SEND (now per-guild)
/////////////////////////////////////////////////////////////////
let lastSentPerGuild = {}; // remember per-guild last date sent

async function sendDaily(reason) {
  try {
    const now = getThaiDate();
    const todayKey = keyDate(now);

    // iterate all guilds bot is in
    for (const [guildId, guild] of client.guilds.cache) {
      try {
        const targetChannelId = guildStore.getNotifyChannel(guildId) || config.channelId || null;
        if (!targetChannelId) continue;
        if (!guild.channels) await guild.fetch(); // ensure
        const ch = await client.channels.fetch(targetChannelId).catch(()=>null);
        if (!ch || !ch.isTextBased()) continue;

        const lastSent = lastSentPerGuild[guildId] || null;
        if (lastSent === todayKey) continue;
        lastSentPerGuild[guildId] = todayKey;

        await ch.send({ content: "@everyone", embeds: [buildEmbed(now)] }).catch(()=>{});
        console.log("ส่งปฏิทินให้ guild", guildId, "เหตุผล:", reason);
      } catch (e) {
        console.log("sendDaily per-guild error for guild", guildId, e.message);
      }
    }
  } catch (e) {
    console.error("sendDaily general error:", e);
  }
}

/////////////////////////////////////////////////////////////////
// VOICE (join per-guild via command)
/////////////////////////////////////////////////////////////////
async function doJoinVoice(guildId, voiceChannelId) {
  try {
    const ch = await client.channels.fetch(voiceChannelId).catch(()=>null);
    if (!ch || !ch.isVoiceBased()) throw new Error("ไม่พบห้องเสียงหรือบอทไม่มีสิทธิ์เข้าห้อง");
    const conn = joinVoiceChannel({
      channelId: ch.id,
      guildId: guildId,
      adapterCreator: ch.guild.voiceAdapterCreator,
      selfDeaf: true
    });

    conn.on("error", (e) => console.log("VOICE ERROR", e.message));
    await entersState(conn, VoiceConnectionStatus.Ready, 15000);
    console.log("เข้าห้องเสียงสำเร็จ:", voiceChannelId);
    return true;
  } catch (e) {
    // บาง environment จะโผล่ warning เกี่ยวกับ encryption modes
    // ถ้าบอทเข้าจริง ๆ ก็ไม่ได้กระทบ แต่เราจะ log ให้ชัดเจน
    console.log("joinVoice error:", e.message);
    return false;
  }
}

async function doLeaveVoice(guildId) {
  try {
    const conn = getVoiceConnection(guildId);
    if (conn) {
      conn.destroy();
      return true;
    }
    return false;
  } catch (e) {
    console.log("leaveVoice error:", e.message);
    return false;
  }
}

/////////////////////////////////////////////////////////////////
// ⚡ RANK PANEL / BOT STATUS / TICKETS (unchanged logic kept)
// (most code retained as original but we ensure /rankpanel also accepts channel param)
/////////////////////////////////////////////////////////////////
const PANEL_IMAGE = "https://cdn.discordapp.com/attachments/1445301442092072980/1448043469015613470/IMG_4817.gif";
const WELCOME_IMAGE = "https://cdn.discordapp.com/attachments/1445301442092072980/1448043511558570258/1be0c476c8a40fbe206e2fbc6c5d213c.jpg";

const STATUS_PANEL_IMAGE = "https://cdn.discordapp.com/attachments/1443746157082706054/1448123647524081835/Unknown.gif";
const STATUS_PANEL_ICON = "https://cdn.discordapp.com/attachments/1443746157082706054/1448123939250507887/CFA9E582-8035-4C58-9A79-E1269A5FB025.png";

const TICKET_PANEL_BANNER = "https://cdn.discordapp.com/attachments/1443746157082706054/1448377350961106964/Strawberry_Bunny_Banner___Tickets.jpg?ex=693b0a06&is=6939b886&hm=204d399864f92661f904e81f92777de1bc86593ecd514a58086f36a3e854fe24&";
const TICKET_DIVIDER_IMAGE = "https://cdn.discordapp.com/attachments/1443746157082706054/1448377343004508304/Unknown.gif?ex=693b0a04&is=6939b884&hm=3fcfb00baea9897c604dd69f9a07aeec25ce8b034d99194aa96122a3ebd98bc6&";
const TICKET_SMALL_CORNER = "https://cdn.discordapp.com/attachments/1443746157082706054/1448471958462140549/Unknown.gif?ex=693b6222&is=693a10a2&hm=4017b83df4a29094231e54ee36e431c1f3c97e78f6fd0905328303becc6c739e&";

const REACT_PANEL_TOP = "https://cdn.discordapp.com/attachments/1443960971394809906/1448605236603392142/Unknown.gif";
const REACT_PANEL_BOTTOM = "https://cdn.discordapp.com/attachments/1443960971394809906/1448483231992381530/Unknown.gif";
const REACT_PANEL_ICON = "https://cdn.discordapp.com/attachments/1443746157082706054/1448605563263913984/IMG_5385.gif";
const TICKET_STEP_IMAGE = TICKET_DIVIDER_IMAGE;

/////////////////////////////////////////////////////////////////
// Slash Commands Register (updated: new per-guild setters + join)
/////////////////////////////////////////////////////////////////
async function registerCommands() {
  try {
    const commands = [
      new SlashCommandBuilder()
        .setName("rankpanel")
        .setDescription("สร้างหน้า Panel รับยศ (เฉพาะแอดมินของเซิร์ฟ) และต้องใส่ช่องที่จะโพส")
        .addRoleOption((opt) =>
          opt
            .setName("role")
            .setDescription("ยศที่ต้องการให้เมื่อกดปุ่มรับยศ")
            .setRequired(true)
        )
        .addChannelOption(opt => opt.setName("channel").setDescription("ห้องที่จะให้ส่งหน้า Panel").addChannelTypes(ChannelType.GuildText).setRequired(true)),

      new SlashCommandBuilder()
        .setName("botpanel")
        .setDescription("สร้าง Panel แสดงสถานะบอทในเซิร์ฟ (เฉพาะแอดมิน) — ต้องใส่ช่อง")
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription("ห้องที่จะให้บอทส่ง Panel สถานะ")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        ),

      new SlashCommandBuilder()
        .setName("ticketpanel")
        .setDescription("สร้าง Panel Tickets สำหรับติดต่อแอดมิน (เฉพาะแอดมิน) — ต้องใส่ช่อง")
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription("ห้องที่จะให้บอทส่ง Panel Tickets")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        ),

      // new per-guild setters (owner-only)
      new SlashCommandBuilder()
        .setName("setcalendar")
        .setDescription("ตั้งห้องที่จะให้ส่งปฏิทินรายวัน (เฉพาะเจ้าของเซิร์ฟ)")
        .addChannelOption(opt => opt.setName("channel").setDescription("ห้องข้อความสำหรับปฏิทินรายวัน").addChannelTypes(ChannelType.GuildText).setRequired(true)),

      new SlashCommandBuilder()
        .setName("setwelcome")
        .setDescription("ตั้งห้องต้อนรับ (เฉพาะเจ้าของเซิร์ฟ)")
        .addChannelOption(opt => opt.setName("channel").setDescription("ห้องข้อความสำหรับส่งข้อความต้อนรับ").addChannelTypes(ChannelType.GuildText).setRequired(true)),

      new SlashCommandBuilder()
        .setName("setwelcomelog")
        .setDescription("ตั้งห้องสำหรับ log ต้อนรับ/แจ้งเตือน (เฉพาะเจ้าของเซิร์ฟ)")
        .addChannelOption(opt => opt.setName("channel").setDescription("ห้องข้อความสำหรับ welcome log/แจ้งเตือน").addChannelTypes(ChannelType.GuildText).setRequired(true)),

      new SlashCommandBuilder()
        .setName("join")
        .setDescription("ให้บอทเข้าห้องเสียง (ต้องใส่ห้องเสียง) — เจ้าของเซิร์ฟเท่านั้น")
        .addChannelOption(opt => opt.setName("voice_channel").setDescription("ห้องเสียงที่ต้องการให้บอทเข้าร่วม").addChannelTypes(ChannelType.GuildVoice).setRequired(true)),

      new SlashCommandBuilder()
        .setName("leave")
        .setDescription("ให้บอทออกจากห้องเสียง (เจ้าของเซิร์ฟเท่านั้น)")
        .addChannelOption(opt => opt.setName("voice_channel").setDescription("ห้องเสียง (optional) — ถ้าไม่ใส่ จะออกจากห้องของเซิร์ฟนี้ถ้าเชื่อมอยู่").addChannelTypes(ChannelType.GuildVoice).setRequired(false))
    ].map((c) => c.toJSON());

    // Prefer registering globally via application if clientId provided
    if (config.clientId) {
      const rest = new REST({ version: "10" }).setToken(config.token);
      await rest.put(Routes.applicationCommands(config.clientId), { body: commands });
      console.log("REGISTERED global commands via config.clientId");
    } else {
      // fallback: set application commands for the bot account (may be slower)
      if (client.application) {
        await client.application.commands.set(commands);
        console.log("REGISTERED commands via client.application.commands");
      } else {
        console.log("[WARN] client.application not ready; can't register commands now.");
      }
    }
  } catch (err) {
    console.log("Failed to register commands:", err.message);
  }
}

/////////////////////////////////////////////////////////////////
// BOT STATUS PANEL DATA & helpers (kept)
/////////////////////////////////////////////////////////////////
const botPanels = new Map();

function formatHMS(ms) {
  if (!ms || ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return (
    hours.toString().padStart(2, "0") +
    " ชั่วโมง " +
    minutes.toString().padStart(2, "0") +
    " นาที " +
    seconds.toString().padStart(2, "0") +
    " วินาที"
  );
}

function updateTimeState(panelData, botId, isOnline) {
  if (!panelData.timeState) panelData.timeState = new Map();
  const now = Date.now();
  const key = botId;
  let st = panelData.timeState.get(key);
  const current = isOnline ? "online" : "offline";
  if (!st) {
    st = { lastStatus: current, lastChangeAt: now };
    panelData.timeState.set(key, st);
    return st;
  }
  if (st.lastStatus !== current) {
    st.lastStatus = current;
    st.lastChangeAt = now;
  }
  return st;
}

function buildBotPanelEmbed(guild, panelData) {
  const blocks = [];
  let index = 1;
  const now = Date.now();

  if (!panelData.maintenance) panelData.maintenance = new Set();
  if (!panelData.stopped) panelData.stopped = new Set();
  if (!panelData.timeState) panelData.timeState = new Map();

  for (const botId of panelData.botIds) {
    const member = guild.members.cache.get(botId);
    const mention = `<@${botId}>`;
    const presence = member?.presence;
    const isOnline = presence && presence.status && presence.status !== "offline";
    const inMaintenance = panelData.maintenance.has(botId);
    const isStopped = panelData.stopped.has(botId);

    const state = updateTimeState(panelData, botId, isOnline);
    let onlineMs = 0;
    let offlineMs = 0;
    if (state.lastStatus === "online") {
      onlineMs = now - state.lastChangeAt;
      offlineMs = 0;
    } else {
      offlineMs = now - state.lastChangeAt;
      onlineMs = 0;
    }

    let statusLine;
    let modeLine;
    if (isStopped) {
      statusLine = isOnline ? "🛰 สถานะ : ออนไลน์อยู่ 🟢" : "🛰 สถานะ : ออฟไลน์อยู่ 🔴";
      modeLine = "⚙ โหมด : หยุดบอทชั่วคราว ⚫️";
    } else if (inMaintenance && !isOnline) {
      statusLine = "🛰 สถานะ : ออฟไลน์อยู่ 🔴";
      modeLine = "⚙ โหมด : ยังแก้ไขอยู่ 🚨";
    } else if (inMaintenance && isOnline) {
      statusLine = "🛰 สถานะ : ออนไลน์อยู่ 🟢";
      modeLine = "⚙ โหมด : กำลังปรับปรุงอยู่ 🛠️";
    } else if (isOnline) {
      statusLine = "🛰 สถานะ : ออนไลน์อยู่ 🟢";
      modeLine = "⚙ โหมด : ปกติ ♻️";
    } else {
      statusLine = "🛰 สถานะ : ออฟไลน์อยู่ 🔴";
      modeLine = "⚙ โหมด : ปกติ ♻️";
    }

    let doingLine;
    const vs = member?.voice;
    if (isOnline && vs?.channel) doingLine = `กำลัง : ออนห้องเสียง ${vs.channel.toString()} 🎧`;
    else if (isOnline) doingLine = "กำลัง : ว่างอยู่ รอซีม่อน 💖";
    else if (inMaintenance) doingLine = "กำลัง : แก้ไขปรับปรุงอีกนิด 🪛";
    else if (isStopped) doingLine = "กำลัง : หยุดทำงานชั่วคราว ⏸️";
    else doingLine = "กำลัง : ออฟไลน์อยู่พักผ่อนแป๊บนึง 😴";

    const onlineLine = "บอทออนไลน์ : " + formatHMS(onlineMs) + " ⏰";
    const offlineLine = "บอทออฟไลน์ : " + formatHMS(offlineMs) + " 🕰️";

    blocks.push(`**${index}. ${mention}**\n${statusLine}\n${modeLine}\n${doingLine}\n${onlineLine}\n${offlineLine}`);
    index++;
  }

  const desc = `🛰️ สถานะบอทในเซิร์ฟเวอร์ **${guild.name}**\n━━━━━━━━━━━━━━━━━━━━━━\n\n${blocks.join("\n\n")}\n\n> ใช้ปุ่มด้านล่างสำหรับแอดมินในการอัปเดต เช็ก และจัดการสถานะบอทแต่ละตัวแบบเรียลไทม์นะค้าบ 💗`;

  return new EmbedBuilder()
    .setColor(0x00ffc8)
    .setTitle("🌸 xSwift Hub | Bot Status Panel")
    .setDescription(desc)
    .setImage(STATUS_PANEL_IMAGE)
    .setThumbnail(STATUS_PANEL_ICON)
    .setFooter({ text: "อัปเดตสถานะอัตโนมัติทุก ๆ 10 วินาที • By Zemon Źx" });
}

async function updateBotPanel(guildId) {
  const panel = botPanels.get(guildId);
  if (!panel) return;
  try {
    const guild = await client.guilds.fetch(guildId);
    await guild.members.fetch({ user: panel.botIds });
    const channel = await client.channels.fetch(panel.channelId).catch(()=>null);
    if (!channel || !channel.isTextBased()) return;
    const msg = await channel.messages.fetch(panel.messageId).catch(()=>null);
    if (!msg) return;
    const embed = buildBotPanelEmbed(guild, panel);
    await msg.edit({ embeds: [embed] }).catch(()=>{});
  } catch (err) {
    console.log("อัปเดท Bot Panel ล้มเหลว:", err.message);
  }
}

/////////////////////////////////////////////////////////////////
// TICKET SYSTEM DATA (kept)
/////////////////////////////////////////////////////////////////
const ticketByUser = new Map();
const ticketOwnerByChannel = new Map();

function buildTicketPanelEmbeds(guild) {
  const bannerEmbed = new EmbedBuilder().setColor(0xffb6dc).setImage(TICKET_PANEL_BANNER);
  const rulesText = `┍━━━━━»•» 🌺 «•«━┑
        🌸 𝚃𝚒𝚌𝚔𝚎𝚝𝚜 𝚁𝚞𝚕𝚎𝚜 🌸
┕━»•» 🌺 «•«━━━━━┙
╭┈ ✧ : ห้ามมีเปิด Tickets หลายห้องนะคะ ˗ˏˋ꒰ 🍒 ꒱
 | 💮・ห้ามเปิดเล่น | บองบอท |
 | 💐・ห้ามสแปม @/ping แอดมินรัวๆ
 | 🪻・คุยดีๆเคารพกัน กับ สตาฟ
 | 🌻・ติดต่อแจ้งปัญหา | สอบถาม
╰ ┈ ✧ : เปิด Tickets ต่อเมื่อมีเรื่องจริงๆน้า ┆ • ➵ xSɯιϝƚ Hυζ : Bყ Zҽɱσɳ Źx ☄️`;
  const rulesEmbed = new EmbedBuilder().setColor(0xffb6dc).setDescription(rulesText).setThumbnail(TICKET_SMALL_CORNER);
  const dividerEmbed = new EmbedBuilder().setColor(0xffb6dc).setImage(TICKET_STEP_IMAGE);
  return [bannerEmbed, rulesEmbed, dividerEmbed];
}

function buildTicketIntroEmbed(user) {
  const descLines = [
    "✧˚₊‧  **welcome to your ticket**  ‧₊˚✧",
    "",
    `╰┈➤ ผู้เปิด Ticket : ${user}`,
    "╰┈➤ ทีมงานจะเข้ามาตอบให้เร็วที่สุดเลยนะค้า 💗",
    "",
    "you can:",
    "・อธิบายปัญหาที่เจอ / สิ่งที่ต้องการความช่วยเหลือ",
    "・แนบรูป / วิดีโอ / ลิ้งก์ที่เกี่ยวข้อง",
    "",
    "เมื่อคุยจบแล้ว แอดมินสามารถกดปุ่มด้านล่างเพื่อปิด Ticket ได้เลยค่ะ 🎟️"
  ];
  return new EmbedBuilder().setColor(0xffb6dc).setTitle("🎟️ Ticket เปิดเรียบร้อยแล้ว").setDescription(descLines.join("\n"));
}

function findStaffRole(guild) {
  return guild.roles.cache.find((r) => r.name === "ผู้ดูแล") || null;
}

function userIsStaffOrAdmin(member) {
  if (!member) return false;
  if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
  const modRole = member.guild.roles.cache.find((r) => r.name === "ผู้ดูแล");
  if (modRole && member.roles.cache.has(modRole.id)) return true;
  return false;
}

/////////////////////////////////////////////////////////////////
// Interaction Handler (Slash + Button + Select)
// Note: Reaction handlers removed.
/////////////////////////////////////////////////////////////////
client.on("interactionCreate", async (i) => {
  try {
    // Slash Commands
    if (i.isChatInputCommand()) {

      // helper: allow owner or global super-admins (config.adminIds)
      const isOwner = i.guild && i.user && (i.user.id === i.guild.ownerId);
      const isSuperAdmin = config.adminIds && config.adminIds.includes(i.user.id);

      // ===== /rankpanel =====
      if (i.commandName === "rankpanel") {
        if (!i.member.permissions.has(PermissionsBitField.Flags.Administrator) && !isSuperAdmin) {
          return i.reply({ content: "❌ ต้องเป็นแอดมินเซิร์ฟเท่านั้นน้า", ephemeral: true });
        }
        const role = i.options.getRole("role");
        const targetChannel = i.options.getChannel("channel");
        if (!role) return i.reply({ content: "❌ ไม่พบยศที่เลือกนะค้าบ", ephemeral: true });
        if (!targetChannel || !targetChannel.isTextBased()) return i.reply({ content: "❌ กรุณาเลือกห้องข้อความปกตินะค้าบ", ephemeral: true });

        const embed = new EmbedBuilder().setColor(0xf772d4).setTitle("🌸 รับยศของคุณได้เลย!").setDescription(`กดปุ่มด้านล่างเพื่อรับยศ **${role.name}** เข้าสู่ระบบ xSwift Hub นะค้าบ 💗`).setImage(PANEL_IMAGE).setFooter({ text: "xSwift Hub | By Zemon Źx" });
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`rank_accept_${role.id}`).setStyle(ButtonStyle.Success).setLabel("💗 รับยศเลย!"));

        await targetChannel.send({ embeds: [embed], components: [row] }).catch(()=>{});
        return i.reply({ content: `✅ สร้าง Rank Panel ใน ${targetChannel} เรียบร้อยค้าบ`, ephemeral: true });
      }

      // ===== /botpanel =====
      if (i.commandName === "botpanel") {
        if (!i.member.permissions.has(PermissionsBitField.Flags.Administrator) && !isSuperAdmin) return i.reply({ content: "❌ ต้องเป็นแอดมินเซิร์ฟเท่านั้นน้า", ephemeral: true });
        const targetChannel = i.options.getChannel("channel");
        if (!targetChannel || !targetChannel.isTextBased()) return i.reply({ content: "❌ กรุณาเลือกห้องข้อความปกตินะค้าบ", ephemeral: true });
        await i.guild.members.fetch();
        const bots = i.guild.members.cache.filter((m) => m.user.bot);
        if (!bots.size) return i.reply({ content: "❌ เซิร์ฟนี้ยังไม่มีบอทให้เช็กสถานะเลยน้า", ephemeral: true });

        const panelData = { channelId: targetChannel.id, messageId: null, botIds: bots.map((m) => m.id), maintenance: new Set(), stopped: new Set(), timeState: new Map() };

        // ensure timeState preserved if existing
        const existing = guildStore.getPanelData(i.guild.id);
        if (existing && existing.timeState) {
          for (const [k, v] of existing.timeState) panelData.timeState.set(k, v);
          panelData.maintenance = existing.maintenance || panelData.maintenance;
          panelData.stopped = existing.stopped || panelData.stopped;
        }

        // initialize any new bot timestamps
        for (const bId of panelData.botIds) {
          if (!panelData.timeState.has(bId)) {
            const mem = i.guild.members.cache.get(bId);
            const isOnline = mem?.presence && mem.presence.status && mem.presence.status !== "offline";
            panelData.timeState.set(bId, { lastStatus: isOnline ? "online" : "offline", lastChangeAt: Date.now() });
          }
        }

        const embed = buildBotPanelEmbed(i.guild, panelData);
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`botpanel_refresh_${i.guild.id}`).setStyle(ButtonStyle.Primary).setLabel("🔄 อัปเดตสถานะ"),
          new ButtonBuilder().setCustomId(`botpanel_manage_${i.guild.id}`).setStyle(ButtonStyle.Secondary).setLabel("🛠️ ตั้งสถานะปรับปรุง"),
          new ButtonBuilder().setCustomId(`botpanel_inspect_${i.guild.id}`).setStyle(ButtonStyle.Secondary).setLabel("📊 เช็คบอท"),
          new ButtonBuilder().setCustomId(`botpanel_stop_${i.guild.id}`).setStyle(ButtonStyle.Danger).setLabel("⏹️ หยุดทำงาน")
        );

        const msg = await targetChannel.send({ embeds: [embed], components: [row] });
        panelData.messageId = msg.id;
        botPanels.set(i.guild.id, panelData);
        guildStore.setPanelData(i.guild.id, panelData); // persist

        return i.reply({ content: `✅ สร้าง Bot Status Panel ใน ${targetChannel} เรียบร้อยค้าบ`, ephemeral: true });
      }

      // ===== /ticketpanel =====
      if (i.commandName === "ticketpanel") {
        if (!i.member.permissions.has(PermissionsBitField.Flags.Administrator) && !isSuperAdmin) return i.reply({ content: "❌ คำสั่งนี้สำหรับแอดมินเท่านั้นน้า", ephemeral: true });
        const targetChannel = i.options.getChannel("channel");
        if (!targetChannel || !targetChannel.isTextBased()) return i.reply({ content: "❌ กรุณาเลือกห้องข้อความปกตินะค้าบ", ephemeral: true });
        const embeds = buildTicketPanelEmbeds(i.guild);
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("ticket_open").setStyle(ButtonStyle.Primary).setLabel("🎟️ เปิด Ticket ติดต่อทีมงาน"));
        await targetChannel.send({ embeds, components: [row] });
        return i.reply({ content: `✅ สร้าง Tickets Panel ใน ${targetChannel} เรียบร้อยแล้วค้าบ`, ephemeral: true });
      }

      // ===== /setcalendar ===== (owner-only)
      if (i.commandName === "setcalendar") {
        if (!i.guild) return i.reply({ content: "❌ คำสั่งนี้ใช้ในเซิร์ฟเท่านั้น", ephemeral: true });
        if (!isOwner && !isSuperAdmin) return i.reply({ content: "❌ คำสั่งนี้เฉพาะเจ้าของเซิร์ฟเท่านั้นน้า", ephemeral: true });
        const channel = i.options.getChannel("channel");
        if (!channel || !channel.isTextBased()) return i.reply({ content: "❌ กรุณาเลือกห้องข้อความ", ephemeral: true });
        guildStore.setNotifyChannel(i.guild.id, channel.id);
        return i.reply({ content: `✅ ตั้งห้องปฏิทินรายวันเป็น ${channel} เรียบร้อย`, ephemeral: true });
      }

      // ===== /setwelcome ===== (owner-only)
      if (i.commandName === "setwelcome") {
        if (!i.guild) return i.reply({ content: "❌ คำสั่งนี้ใช้ในเซิร์ฟเท่านั้น", ephemeral: true });
        if (!isOwner && !isSuperAdmin) return i.reply({ content: "❌ คำสั่งนี้เฉพาะเจ้าของเซิร์ฟเท่านั้นน้า", ephemeral: true });
        const channel = i.options.getChannel("channel");
        if (!channel || !channel.isTextBased()) return i.reply({ content: "❌ กรุณาเลือกห้องข้อความ", ephemeral: true });
        guildStore.ensureGuildConfig(i.guild.id);
        guildStore.setWelcomeChannel(i.guild.id, channel.id);
        return i.reply({ content: `✅ ตั้งห้องต้อนรับเป็น ${channel} เรียบร้อย`, ephemeral: true });
      }

      // ===== /setwelcomelog ===== (owner-only)
      if (i.commandName === "setwelcomelog") {
        if (!i.guild) return i.reply({ content: "❌ คำสั่งนี้ใช้ในเซิร์ฟเท่านั้น", ephemeral: true });
        if (!isOwner && !isSuperAdmin) return i.reply({ content: "❌ คำสั่งนี้เฉพาะเจ้าของเซิร์ฟเท่านั้นน้า", ephemeral: true });
        const channel = i.options.getChannel("channel");
        if (!channel || !channel.isTextBased()) return i.reply({ content: "❌ กรุณาเลือกห้องข้อความ", ephemeral: true });
        guildStore.setWelcomeLogChannel(i.guild.id, channel.id);
        return i.reply({ content: `✅ ตั้งห้อง welcome log เป็น ${channel} เรียบร้อย`, ephemeral: true });
      }

      // ===== /join ===== (owner-only) - join provided voice channel and save voice id for guild
      if (i.commandName === "join") {
        if (!i.guild) return i.reply({ content: "❌ คำสั่งนี้ใช้ในเซิร์ฟเท่านั้น", ephemeral: true });
        if (!isOwner && !isSuperAdmin) return i.reply({ content: "❌ คำสั่งนี้เฉพาะเจ้าของเซิร์ฟเท่านั้นน้า", ephemeral: true });
        const voiceChannel = i.options.getChannel("voice_channel");
        if (!voiceChannel || !voiceChannel.isVoiceBased()) return i.reply({ content: "❌ กรุณาเลือกห้องเสียง", ephemeral: true });
        const ok = await doJoinVoice(i.guild.id, voiceChannel.id);
        if (ok) {
          guildStore.setVoiceChannel(i.guild.id, voiceChannel.id);
          return i.reply({ content: `✅ เข้าห้องเสียงเรียบร้อย: ${voiceChannel}`, ephemeral: true });
        } else {
          return i.reply({ content: `❌ ล้มเหลวในการเข้าห้องเสียง กรุณาตรวจสอบสิทธิ์`, ephemeral: true });
        }
      }

      // ===== /leave ===== (owner-only)
      if (i.commandName === "leave") {
        if (!i.guild) return i.reply({ content: "❌ คำสั่งนี้ใช้ในเซิร์ฟเท่านั้น", ephemeral: true });
        if (!isOwner && !isSuperAdmin) return i.reply({ content: "❌ คำสั่งนี้เฉพาะเจ้าของเซิร์ฟเท่านั้นน้า", ephemeral: true });
        const voiceChannel = i.options.getChannel("voice_channel");
        // if provided channel, ensure it's that guild's channel
        if (voiceChannel && (!voiceChannel.isVoiceBased() || voiceChannel.guildId !== i.guild.id)) {
          return i.reply({ content: "❌ ช่องเสียงไม่ถูกต้อง", ephemeral: true });
        }
        const ok = await doLeaveVoice(i.guild.id);
        if (ok) {
          guildStore.setVoiceChannel(i.guild.id, null);
          return i.reply({ content: `✅ ออกจากห้องเสียงเรียบร้อย`, ephemeral: true });
        } else {
          return i.reply({ content: `❌ บอทไม่ได้เชื่อมต่อในห้องเสียงของเซิร์ฟนี้`, ephemeral: true });
        }
      }

      return;
    }

    // Buttons (rank_accept + botpanel + ticket + welcome)
    if (i.isButton()) {
      // ===== ปุ่มรับยศ =====
      if (i.customId.startsWith("rank_accept_")) {
        const roleId = i.customId.replace("rank_accept_", "");
        const role = i.guild.roles.cache.get(roleId);
        if (!role) return i.reply({ content: "❌ ยศนี้ถูกลบหรือหาไม่เจอแล้วน้า", ephemeral: true });

        try {
          await i.member.roles.add(role);
          const welLogId = guildStore.getWelcomeLogChannel(i.guild.id) || config.welcomeLog;
          if (welLogId) {
            try {
              const logChannel = await client.channels.fetch(welLogId).catch(()=>null);
              if (logChannel && logChannel.isTextBased()) {
                const e = new EmbedBuilder().setColor(0xff99dd).setTitle("🎉 ยินดีต้อนรับสมาชิกใหม่!").setDescription(`สวัสดี ${i.member} !\nคุณได้รับยศ **${role.name}** เรียบร้อยแล้วนะค้าบ 💗\nขอให้สนุกไปกับ xSwift Hub น้าา 🌸`).setImage(WELCOME_IMAGE).setFooter({ text: "xSwift Hub | By Zemon Źx" });
                await logChannel.send({ embeds: [e] }).catch(()=>{});
              }
            } catch (err) {
              console.log("ส่งข้อความห้อง welcomeLog ไม่สำเร็จ:", err.message);
            }
          }

          return i.reply({ content: "💗 รับยศเรียบร้อยค้าบ!", ephemeral: true });
        } catch (err) {
          console.error("ให้ยศไม่สำเร็จ:", err);
          return i.reply({ content: "❌ ให้ยศไม่สำเร็จ ลองใหม่อีกครั้งน้า", ephemeral: true });
        }
      }

      // ===== Bot Panel Buttons =====
      if (i.customId === `botpanel_refresh_${i.guild.id}`) {
        if (!i.member.permissions.has(PermissionsBitField.Flags.Administrator) && !config.adminIds.includes(i.user.id)) return i.reply({ content: "❌ ปุ่มนี้ให้แอดมินกดเท่านั้นนะค้าบ", ephemeral: true });
        await updateBotPanel(i.guild.id);
        return i.reply({ content: "🔄 อัปเดตสถานะบอททั้งหมดใน Panel แล้วค้าบ", ephemeral: true });
      }

      if (i.customId === `botpanel_manage_${i.guild.id}`) {
        if (!i.member.permissions.has(PermissionsBitField.Flags.Administrator) && !config.adminIds.includes(i.user.id)) return i.reply({ content: "❌ ปุ่มนี้ให้แอดมินกดเท่านั้นนะค้าบ", ephemeral: true });
        const panel = botPanels.get(i.guild.id);
        if (!panel) return i.reply({ content: "❌ ยังไม่มี Bot Status Panel สำหรับเซิร์ฟนี้นะ ลองใช้คำสั่ง /botpanel ก่อนน้า", ephemeral: true });

        const options = panel.botIds.map((id) => {
          const member = i.guild.members.cache.get(id);
          const label = member ? member.user.username : `Bot ${id}`;
          const inMaint = panel.maintenance.has(id);
          return { label, value: id, description: inMaint ? "ยกเลิกสถานะกำลังปรับปรุง" : "ตั้งให้กำลังปรับปรุง" };
        }).slice(0,25);

        const select = new StringSelectMenuBuilder().setCustomId("botpanel_select").setPlaceholder("เลือกบอทที่จะสลับสถานะ 🛠️ / ปกติ").addOptions(options);
        const row = new ActionRowBuilder().addComponents(select);
        return i.reply({ content: "เลือกบอทที่ต้องการสลับสถานะกำลังปรับปรุงนะค้าบ 💗", components: [row], ephemeral: true });
      }

      if (i.customId === `botpanel_inspect_${i.guild.id}`) {
        if (!i.member.permissions.has(PermissionsBitField.Flags.Administrator) && !config.adminIds.includes(i.user.id)) return i.reply({ content: "❌ ปุ่มนี้ให้แอดมินเท่านั้นน้า", ephemeral: true });
        const panel = botPanels.get(i.guild.id);
        if (!panel) return i.reply({ content: "❌ ยังไม่มี Bot Status Panel สำหรับเซิร์ฟนี้นะ ลองใช้คำสั่ง /botpanel ก่อนน้า", ephemeral: true });

        const options = panel.botIds.map((id) => {
          const member = i.guild.members.cache.get(id);
          const label = member ? member.user.username : `Bot ${id}`;
          return { label, value: id, description: "ดูรายละเอียดสถานะบอทตัวนี้" };
        }).slice(0,25);

        const select = new StringSelectMenuBuilder().setCustomId("botpanel_inspect_select").setPlaceholder("เลือกบอทที่ต้องการเช็คสถานะ 📊").addOptions(options);
        const row = new ActionRowBuilder().addComponents(select);
        return i.reply({ content: "เลือกบอทที่ต้องการเช็คสถานะละเอียดเลยค้าบ 💗", components: [row], ephemeral: true });
      }

      if (i.customId === `botpanel_stop_${i.guild.id}`) {
        if (!i.member.permissions.has(PermissionsBitField.Flags.Administrator) && !config.adminIds.includes(i.user.id)) return i.reply({ content: "❌ ปุ่มนี้ให้แอดมินกดเท่านั้นนะค้าบ", ephemeral: true });
        const panel = botPanels.get(i.guild.id);
        if (!panel) return i.reply({ content: "❌ ยังไม่มี Bot Status Panel สำหรับเซิร์ฟนี้นะ ลองใช้คำสั่ง /botpanel ก่อนน้า", ephemeral: true });

        const options = panel.botIds.map((id) => {
          const member = i.guild.members.cache.get(id);
          const label = member ? member.user.username : `Bot ${id}`;
          const isStopped = panel.stopped.has(id);
          return { label, value: id, description: isStopped ? "ยกเลิกโหมดหยุดชั่วคราว" : "ตั้งให้หยุดบอทชั่วคราว" };
        }).slice(0,25);

        const select = new StringSelectMenuBuilder().setCustomId("botpanel_stop_select").setPlaceholder("เลือกบอทที่จะหยุด / ปลดหยุด ⚫️").addOptions(options);
        const row = new ActionRowBuilder().addComponents(select);
        return i.reply({ content: "เลือกบอทที่ต้องการตั้งโหมด “หยุดบอทชั่วคราว ⚫️” หรือปลดโหมดนี้ได้เลยค้าบ", components: [row], ephemeral: true });
      }

      // ===== Ticket Buttons =====
      if (i.customId === "ticket_open") {
        const guild = i.guild;
        const user = i.user;
        const key = `${guild.id}:${user.id}`;
        const existingChannelId = ticketByUser.get(key);
        if (existingChannelId) {
          const existingChannel = guild.channels.cache.get(existingChannelId);
          if (existingChannel) return i.reply({ content: `❌ เธอมี Ticket เปิดอยู่แล้วที่ ${existingChannel} น้า ถ้ามีเรื่องใหม่ค่อยให้แอดมินปิดห้องเก่าก่อนนะค้าบ`, ephemeral: true });
          else { ticketByUser.delete(key); ticketOwnerByChannel.delete(existingChannelId); }
        }

        const parent = i.channel.parent ?? null;
        const staffRole = findStaffRole(guild);
        const overwrites = [
          { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: user.id, allow: [ PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.AttachFiles ] },
          { id: client.user.id, allow: [ PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.ManageMessages ] },
          { id: guild.ownerId, allow: [ PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.ManageChannels ] }
        ];
        if (staffRole) overwrites.push({ id: staffRole.id, allow: [ PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.ManageMessages ] });

        const channelName = "ticket-" + user.username.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 16);
        const ticketChannel = await guild.channels.create({
          name: channelName || `ticket-${user.id}`,
          type: ChannelType.GuildText,
          parent: parent ?? undefined,
          topic: `Ticket สำหรับ ${user.tag} | UserID: ${user.id}`,
          permissionOverwrites: overwrites
        });

        ticketByUser.set(key, ticketChannel.id);
        ticketOwnerByChannel.set(ticketChannel.id, { guildId: guild.id, userId: user.id });

        const embed = buildTicketIntroEmbed(user);
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("ticket_close").setStyle(ButtonStyle.Danger).setLabel("🔐 ปิด Ticket นี้"));
        await ticketChannel.send({ content: `${user} | <@${guild.ownerId}>${staffRole ? ` | ${staffRole}` : ""}`, embeds: [embed], components: [row] });

        return i.reply({ content: `🎟️ สร้างห้อง Ticket ให้แล้วน้า -> ${ticketChannel}`, ephemeral: true });
      }

      if (i.customId === "ticket_close") {
        const member = i.member;
        if (!userIsStaffOrAdmin(member)) return i.reply({ content: "❌ ปิด Ticket ไม่ได้จ้า ปุ่มนี้ให้แอดมิน / ผู้ดูแล ปิดให้เท่านั้นน้า 💗", ephemeral: true });
        const channel = i.channel;
        const ownerInfo = ticketOwnerByChannel.get(channel.id);
        if (ownerInfo) {
          const key = `${ownerInfo.guildId}:${ownerInfo.userId}`;
          ticketByUser.delete(key);
          ticketOwnerByChannel.delete(channel.id);
        }
        await i.reply({ content: "🔐 ปิด Ticket แล้ว ขอบคุณที่ติดต่อทีมงานน้า 💗", ephemeral: false });
        setTimeout(() => { channel.delete().catch(()=>{}); }, 3000);
        return;
      }

      // ===== Welcome staff quick actions handled below in separate listener =====
    }

    // Select Menu handlers...
    if (i.isStringSelectMenu()) {
      if (i.customId === "botpanel_select") {
        if (!i.member.permissions.has(PermissionsBitField.Flags.Administrator) && !config.adminIds.includes(i.user.id)) return i.reply({ content: "❌ เฉพาะแอดมินเท่านั้นน้า", ephemeral: true });
        const panel = botPanels.get(i.guild.id);
        if (!panel) return i.update({ content: "❌ ไม่มี Bot Status Panel แล้ว (อาจถูกลบไปแล้ว)", components: [] });
        for (const id of i.values) {
          if (panel.maintenance.has(id)) panel.maintenance.delete(id);
          else panel.maintenance.add(id);
        }
        guildStore.setPanelData(i.guild.id, panel); // persist
        await updateBotPanel(i.guild.id);
        return i.update({ content: "✅ อัปเดตสถานะกำลังปรับปรุงของบอทเรียบร้อยค้าบ", components: [] });
      }

      if (i.customId === "botpanel_inspect_select") {
        if (!i.member.permissions.has(PermissionsBitField.Flags.Administrator) && !config.adminIds.includes(i.user.id)) return i.reply({ content: "❌ เฉพาะแอดมินเท่านั้นน้า", ephemeral: true });
        const panel = botPanels.get(i.guild.id);
        if (!panel) return i.update({ content: "❌ ไม่มี Bot Status Panel แล้ว (อาจถูกลบไปแล้ว)", components: [] });

        const botId = i.values[0];
        const guild = await client.guilds.fetch(i.guild.id);
        await guild.members.fetch({ user: [botId] });
        const member = guild.members.cache.get(botId);
        const presence = member?.presence;
        const isOnline = presence && presence.status && presence.status !== "offline";

        const st = panel.timeState ? panel.timeState.get(botId) : { lastStatus: "offline", lastChangeAt: Date.now() };
        const now = Date.now();
        let onlineMs = 0;
        let offlineMs = 0;
        if (st && st.lastStatus === "online") onlineMs = now - st.lastChangeAt;
        else if (st) offlineMs = now - st.lastChangeAt;

        const embed = new EmbedBuilder().setColor(0x5865f2).setTitle(`📊 สถานะบอท: ${member ? member.user.username : botId}`).setDescription([
          `👤 บอท: <@${botId}>`,
          `🛰 สถานะ: ${isOnline ? "ออนไลน์ 🟢" : "ออฟไลน์ 🔴"}`,
          `🕒 ออนไลน์ต่อเนื่อง: ${formatHMS(onlineMs)}`,
          `🕰 ออฟไลน์ต่อเนื่อง: ${formatHMS(offlineMs)}`,
          "",
          `📶 Ping ของบอทสถานะ (ตัวนี้): ${client.ws.ping} ms`,
          `⚙ ข้อมูล CPU / RAM ของบอทตัวอื่นไม่สามารถเช็กตรง ๆ จาก Discord API ได้เลยน้า`
        ].join("\n")).setFooter({ text: "ข้อมูลที่บอทสถานะเช็กให้ได้แบบเรียลไทม์ 💗" });

        return i.update({ content: "รายละเอียดสถานะของบอทที่เลือกค้าบ 📊", embeds: [embed], components: [] });
      }

      if (i.customId === "botpanel_stop_select") {
        if (!i.member.permissions.has(PermissionsBitField.Flags.Administrator) && !config.adminIds.includes(i.user.id)) return i.reply({ content: "❌ เฉพาะแอดมินเท่านั้นน้า", ephemeral: true });
        const panel = botPanels.get(i.guild.id);
        if (!panel) return i.update({ content: "❌ ไม่มี Bot Status Panel แล้ว (อาจถูกลบไปแล้ว)", components: [] });
        if (!panel.stopped) panel.stopped = new Set();
        for (const id of i.values) {
          if (panel.stopped.has(id)) panel.stopped.delete(id);
          else panel.stopped.add(id);
        }
        guildStore.setPanelData(i.guild.id, panel);
        await updateBotPanel(i.guild.id);
        return i.update({ content: "✅ อัปเดตโหมด “หยุดบอทชั่วคราว ⚫️” ของบอทที่เลือกเรียบร้อยค้าบ", components: [] });
      }
    }
  } catch (e) {
    console.log("interactionCreate error:", e.message);
  }
});

/////////////////////////////////////////////////////////////////
// Presence Update -> Refresh Bot Panel
/////////////////////////////////////////////////////////////////
client.on("presenceUpdate", async (oldP, newP) => {
  try {
    const p = newP || oldP;
    if (!p) return;
    const userIsBot = p?.user?.bot ?? (p?.member?.user?.bot ?? false);
    if (!userIsBot) return;
    const guildId = p.guildId || p.guild?.id || (p.member && p.member.guild && p.member.guild.id);
    if (!guildId) return;
    if (!botPanels.has(guildId)) {
      // try to hydrate panel from store if exists
      const saved = guildStore.getPanelData(guildId);
      if (saved) botPanels.set(guildId, saved);
    }
    if (!botPanels.has(guildId)) return;
    updateBotPanel(guildId).catch(err => console.log("presenceUpdate->updateBotPanel err:", err.message));
  } catch (e) {
    console.log("presenceUpdate handler error:", e.message);
  }
});

/////////////////////////////////////////////////////////////////
// NEW: Welcome Ultra — แจ้งเตือนสมาชิก/บอทใหม่ทุกประเภท
/////////////////////////////////////////////////////////////////
client.on("guildMemberAdd", async (member) => {
  try {
    const guild = member.guild;
    const guildId = guild.id;

    // โหลดค่าที่ตั้งไว้
    const welcomeChannelId = guildStore.getWelcomeChannel(guildId);
    const welcomeLogId = guildStore.getWelcomeLogChannel(guildId);

    // ⚡ ช่องที่จะ "ส่งข้อความต้อนรับหลัก"
    let mainChannel = null;
    if (welcomeChannelId) {
      mainChannel = await client.channels.fetch(welcomeChannelId).catch(()=>null);
    }

    // ⚡ ช่องที่จะ "ส่ง Log" (สมาชิกใหม่ + bot ใหม่)
    let logChannel = null;
    if (welcomeLogId) {
      logChannel = await client.channels.fetch(welcomeLogId).catch(()=>null);
    }

    // === ถ้าเป็นบอท ให้ใส่ใน Panel ด้วยและแจ้ง Log ===
    if (member.user.bot) {
      if (logChannel && logChannel.isTextBased()) {
        logChannel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0x00ffbb)
              .setTitle("🤖 บอทใหม่เข้าร่วมเซิร์ฟเวอร์!")
              .setDescription(`บอท ${member} ได้เข้ามาในเซิร์ฟ **${guild.name}** แล้วน้า`)
              .setTimestamp()
          ]
        }).catch(()=>{});
      }

      // อัปเดต Bot Status Panel
      try {
        const panel = botPanels.get(guildId) || guildStore.getPanelData(guildId);
        if (panel) {
          if (!panel.botIds.includes(member.id)) {
            panel.botIds.push(member.id);

            if (!panel.timeState) panel.timeState = new Map();
            panel.timeState.set(member.id, {
              lastStatus: member.presence ? "online" : "offline",
              lastChangeAt: Date.now()
            });

            botPanels.set(guildId, panel);
            guildStore.setPanelData(guildId, panel);
            updateBotPanel(guildId).catch(()=>{});
          }
        }
      } catch (e) {}

      return; // บอทไม่ต้องส่ง embed ต้อนรับแบบมนุษย์
    }


    // === สมาชิกธรรมดา (User) ===
    const createdAt = member.user.createdTimestamp;
    const suspicious = isSuspiciousAccount(createdAt, config.welcomeSuspiciousDays ?? 7);
    const accAge = accountAgeText(createdAt);

    // Embed ต้อนรับหลัก
    const welcomeEmbed = new EmbedBuilder()
      .setColor(0xffa3e5)
      .setTitle(`🎉 ยินดีต้อนรับ ${member.user.username}!`)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .setDescription(
        [
          `สวัสดี ${member} 💗`,
          ``,
          `📌 **ข้อมูลบัญชี**`,
          `• อายุบัญชี: ${accAge}`,
          `• ความน่าเชื่อถือ: ${suspicious ? "⚠️ บัญชีใหม่ โปรดตรวจสอบ" : "✅ ปกติ"}`,
          ``,
          `📊 เซิร์ฟเวอร์: **${guild.name}**`,
          `เข้าร่วมเมื่อ <t:${Math.floor(Date.now()/1000)}:f>`,
        ].join("\n")
      )
      .setImage(WELCOME_IMAGE || "")
      .setTimestamp();

    if (mainChannel && mainChannel.isTextBased()) {
      mainChannel.send({ embeds: [welcomeEmbed] }).catch(()=>{});
    } else {
      // try fallback: channel name matching or system channel
      let fallback = guild.channels.cache.find(c => c.isTextBased() && /welcome|ยินดี|ต้อนรับ/i.test(c.name));
      if (!fallback && guild.systemChannel) fallback = guild.systemChannel;
      if (fallback) fallback.send({ embeds: [welcomeEmbed] }).catch(()=>{});
    }

    // === ส่ง Log ให้แอดมินเสมอ (ทั้งสมาชิก / บอท) ===
    if (logChannel && logChannel.isTextBased()) {
      logChannel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xffccdd)
            .setTitle("📝 สมาชิกใหม่เข้าร่วม")
            .setDescription(`${member} เข้าร่วมเซิร์ฟแล้ว`)
            .addFields(
              { name: "อายุบัญชี", value: accAge, inline: true },
              { name: "ความเสี่ยง", value: suspicious ? "⚠️ บัญชีใหม่" : "ปกติ", inline: true }
            )
            .setTimestamp()
        ]
      }).catch(()=>{});
    }

  } catch (err) {
    console.log("Error in guildMemberAdd welcome handler:", err.message);
  }
});

/////////////////////////////////////////////////////////////////
// Buttons from welcome embed (staff quick actions) - basic handlers
/////////////////////////////////////////////////////////////////
client.on("interactionCreate", async (i) => {
  // Quick-action handler kept separate to avoid mixing with main interaction handler (above)
  try {
    if (!i.isButton()) return;
    const id = i.customId;
    if (id.startsWith("welcome_mute_") || id.startsWith("welcome_kick_")) {
      const member = i.member;
      if (!userIsStaffOrAdmin(member)) {
        return i.reply({ content: "❌ เฉพาะแอดมิน/ผู้ดูแลเท่านั้นที่ใช้ปุ่มนี้ได้", ephemeral: true });
      }

      const parts = id.split("_");
      const action = parts[1]; // mute / kick
      const targetId = parts[2];
      const guild = i.guild;
      const targetMember = await guild.members.fetch(targetId).catch(()=>null);
      if (!targetMember) return i.reply({ content: "❌ ไม่พบสมาชิกเป้าหมาย", ephemeral: true });

      if (action === "mute") {
        try {
          if (typeof targetMember.timeout === "function") {
            await targetMember.timeout(10 * 60 * 1000, "Muted via welcome panel");
            return i.reply({ content: `🔇 ${targetMember} ถูกทำให้เงียบชั่วคราว 10 นาที`, ephemeral: false });
          } else {
            return i.reply({ content: `❌ ฟังก์ชัน timeout ไม่รองรับในเวอร์ชันนี้`, ephemeral: true });
          }
        } catch (e) {
          return i.reply({ content: `❌ ไม่สามารถ mute ได้: ${e.message}`, ephemeral: true });
        }
      } else if (action === "kick") {
        try {
          await targetMember.kick("Kicked by staff via welcome panel");
          return i.reply({ content: `🦶 ${targetMember.user.tag} ถูกเตะออกจากเซิร์ฟเรียบร้อย`, ephemeral: false });
        } catch (e) {
          return i.reply({ content: `❌ ไม่สามารถ kick ได้: ${e.message}`, ephemeral: true });
        }
      }
    }
  } catch (e) {
    console.log("welcome button handler error:", e.message);
  }
});

/////////////////////////////////////////////////////////////////
// READY
/////////////////////////////////////////////////////////////////
client.once("ready", async () => {
  console.log("ล็อกอินเป็น", client.user.tag, "แล้วจ้า 💗");

  // hydrate saved panels into memory
  try {
    const allPanels = guildStore.loadAllPanels();
    for (const [gid, p] of Object.entries(allPanels || {})) {
      botPanels.set(gid, p);
    }
  } catch (e) {
    console.log("hydrate panels error:", e.message);
  }

  await registerCommands();
  await sendDaily("on-ready");

  // ส่งปฏิทินทุกเที่ยงคืน (per-guild)
  cron.schedule("0 0 * * *", () => sendDaily("cron"), { timezone: config.timezone || "Asia/Bangkok" });

  // อัปเดต Bot Status Panel ทุก ๆ 10 วินาทีแบบ global
  setInterval(() => {
    for (const guildId of botPanels.keys()) updateBotPanel(guildId);
  }, 10_000);
});

client.login(config.token).catch(err => {
  console.error("Client login error:", err?.message || err);
});
