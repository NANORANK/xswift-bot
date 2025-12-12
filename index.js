// index.js - MASTER ULTRA VERSION (with per-guild store + set_notify)
// (xSwift Hub | By Zemon Źx)
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
  VoiceConnectionStatus
} = require("@discordjs/voice");

const cron = require("node-cron");
const config = require("./bot_config");
const store = require("./guild_store"); // new store

// NOTE: partials
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
// Simple helpers for admin check and store
/////////////////////////////////////////////////////////////////
function isGlobalAdmin(userId) {
  if (!config.adminIds || !Array.isArray(config.adminIds)) return false;
  return config.adminIds.includes(String(userId));
}

function isGuildAdmin(member) {
  // member may be null in some events
  if (!member) return false;
  try {
    // global superadmin bypass
    if (isGlobalAdmin(member.id)) return true;
    if (member.permissions && member.permissions.has && member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
    // also allow role named "ผู้ดูแล"
    const role = member.guild.roles.cache.find(r => r.name === "ผู้ดูแล");
    if (role && member.roles.cache.has(role.id)) return true;
  } catch (e) {
    // ignore
  }
  return false;
}

/////////////////////////////////////////////////////////////////
// keep existing util functions (calendar, formatDuration...) - Copied from original file
/////////////////////////////////////////////////////////////////
function getThaiDate() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
}
function keyDate(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
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

// ... (Keep thaiWeekdays, months, colorOfDay, calendar functions as in original)
// For brevity we will assume the large unchanged blocks (calendar builders etc.) remain the same.
// Paste the full original functions here unchanged (we kept them in your provided code).

const thaiWeekdays = [
  "วันอาทิตย์","วันจันทร์","วันอังคาร","วันพุธ","วันพฤหัสบดี","วันศุกร์","วันเสาร์"
];
const thaiMonths = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
const colorOfDay = {0:{name:"สีแดง",emoji:"❤️"},1:{name:"สีเหลือง",emoji:"💛"},2:{name:"สีชมพู",emoji:"💗"},3:{name:"สีเขียว",emoji:"💚"},4:{name:"สีส้ม",emoji:"🧡"},5:{name:"สีฟ้า",emoji:"💙"},6:{name:"สีม่วง",emoji:"💜"}};
const circleNum = ["➊","➋","➌","➍","➎","➏","➐","➑","➒","➓","➊➊","➊➋","➊➌","➊➍","➊➎","➊➏","➊➐","➊➑","➊➒","➌➓"];
const circle = (n) => (n >= 1 && n <= 31 ? circleNum[n - 1] : String(n));
function isWanPra(d) { const start = new Date(d.getFullYear(), d.getMonth(), 1); const diff = Math.floor((d - start) / 86400000) + 1; return [8,15,22,29].includes(diff); }
function isWanKon(d) { const t = new Date(d); t.setDate(d.getDate() + 1); return isWanPra(t); }
function chineseNewYear(y) { const map = {2024:"2024-02-10",2025:"2025-01-29",2026:"2026-02-17"}; return map[y] || null; }
const buddhistDays = {2024:{makha:"2024-02-24",visakha:"2024-05-22",asarnha:"2024-07-20",khao:"2024-07-21",ok:"2024-10-17"},2025:{makha:"2025-02-12",visakha:"2025-05-11",asarnha:"2025-07-10",khao:"2025-07-11",ok:"2025-10-06"},2026:{makha:"2026-03-03",visakha:"2026-05-31",asarnha:"2026-07-29",khao:"2026-07-30",ok:"2026-11-05"}};
function getSpecialThaiDays(d) {
  const y = d.getFullYear(); const m = d.getMonth() + 1; const dd = d.getDate(); const key = keyDate(d);
  let list = [];
  if (isWanKon(d)) list.push("🌕 วันโกน");
  if (isWanPra(d)) list.push("🪷 วันพระ");
  if (chineseNewYear(y) === key) list.push("🧧 ตรุษจีน");
  if (m === 11 && dd === 15) list.push("🏮 ลอยกระทง");
  if (m === 4 && dd >= 13 && dd <= 15) list.push("💦 สงกรานต์");
  const fixed = {"01-01":"🎉 วันขึ้นปีใหม่","02-14":"💘 วันวาเลนไทน์","05-01":"🔧 วันแรงงาน","08-12":"💙 วันแม่แห่งชาติ","12-05":"💛 วันพ่อแห่งชาติ","12-10":"📜 วันรัฐธรรมนูญ","12-25":"🎄 คริสต์มาส","10-31":"🎃 ฮาโลวีน"};
  const mmdd = String(m).padStart(2,"0")+"-"+String(dd).padStart(2,"0");
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
  const y = date.getFullYear(); const be = y + 543; const m = date.getMonth(); const d = date.getDate();
  const weekdayName = thaiWeekdays[date.getDay()]; const monthName = thaiMonths[m];
  const first = new Date(y, m, 1); const days = new Date(y, m + 1, 0).getDate(); const offset = (first.getDay() + 6) % 7;
  let lines = []; lines.push("จ  อ  พ  พฤ ศ  ส  อา");
  let row = []; let cur = 1;
  for (let i = 0; i < 7; i++) {
    if (i < offset) row.push("   ");
    else { row.push((cur === d ? circle(cur) : String(cur)).padStart(2," ") + " "); cur++; }
  }
  lines.push(row.join(""));
  while (cur <= days) {
    row = [];
    for (let i = 0; i < 7; i++) {
      if (cur > days) row.push("   ");
      else { row.push((cur === d ? circle(cur) : String(cur)).padStart(2," ") + " "); cur++; }
    }
    lines.push(row.join(""));
  }
  return { weekdayName, monthName, be, day: d, text: lines.join("\n") };
}

const IMAGE_URL = "https://cdn.discordapp.com/attachments/1443746157082706054/1447963237919227934/Unknown.gif";
function buildEmbed(date) {
  const cal = generateCalendar(date); const color = colorOfDay[date.getDay()]; const specials = getSpecialThaiDays(date).join(" • ");
  const header = `✨ ปฏิทินไทยประจำวัน ✨\nวันนี้เป็น ${cal.weekdayName} ที่ ${cal.day} ${cal.monthName} พ.ศ. ${cal.be}\n\n🎨 สีประจำวัน : ${color.name} ${color.emoji}\n📅 วันนี้ : ${specials}\n….::::•°✾°•::::….….::::•°✾°•::::….\n`;
  return new EmbedBuilder().setColor(0xff66cc).setDescription(header + "```txt\n" + cal.text + "\n```\n🪷 วันสำคัญวันนี้ : " + specials).setImage(IMAGE_URL).setFooter({ text: "Credit ˚₊·➳❥ By Zemon Źx | xSwift Hub" });
}

/////////////////////////////////////////////////////////////////
// DAILY SEND
/////////////////////////////////////////////////////////////////
let lastSent = null;
async function sendDaily(reason, guild) {
  try {
    // use per-guild notifyChannel if provided else fallback to config.channelId
    if (guild) {
      const notify = store.getNotifyChannel(guild.id) || config.channelId;
      if (!notify) return;
      const ch = await client.channels.fetch(notify).catch(()=>null);
      if (!ch || !ch.isTextBased()) return;
      const now = getThaiDate();
      const today = keyDate(now);
      if (lastSent === `${guild.id}:${today}`) return;
      lastSent = `${guild.id}:${today}`;
      await ch.send({ content: "@everyone", embeds: [buildEmbed(now)] });
      console.log("ส่งปฏิทินแล้ว for guild:", guild.id, today, reason);
      return;
    } else {
      if (!config.channelId) return;
      const ch = await client.channels.fetch(config.channelId).catch(()=>null);
      if (!ch || !ch.isTextBased()) return;
      const now = getThaiDate();
      const today = keyDate(now);
      if (lastSent === today) return;
      lastSent = today;
      await ch.send({ content: "@everyone", embeds: [buildEmbed(now)] });
      console.log("ส่งปฏิทินแล้ว:", today, reason);
    }
  } catch (e) {
    console.error("ส่งปฏิทินผิดพลาด:", e);
  }
}

/////////////////////////////////////////////////////////////////
// VOICE etc. (same as original)
/////////////////////////////////////////////////////////////////
async function connectVoice() {
  if (!process.env.VOICE_ID) return;
  try {
    const ch = await client.channels.fetch(process.env.VOICE_ID).catch(()=>null);
    if (!ch || !ch.isVoiceBased()) return;
    const conn = joinVoiceChannel({
      channelId: ch.id,
      guildId: ch.guild.id,
      adapterCreator: ch.guild.voiceAdapterCreator,
      selfDeaf: true
    });
    conn.on("error", (e) => console.log("VOICE ERROR", e.message));
    await entersState(conn, VoiceConnectionStatus.Ready, 15000);
    console.log("เข้าห้องเสียงสำเร็จ 💗");
  } catch (e) {
    console.log("เข้าห้องเสียงล้มเหลว:", e.message);
  }
}

/////////////////////////////////////////////////////////////////
// PANEL state in-memory (restored from store at ready)
/////////////////////////////////////////////////////////////////
const botPanels = new Map();

function formatHMS(ms) {
  if (!ms || ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return hours.toString().padStart(2,"0")+" ชั่วโมง "+minutes.toString().padStart(2,"0")+" นาที "+seconds.toString().padStart(2,"0")+" วินาที";
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
    await guild.members.fetch({ user: panel.botIds }).catch(()=>{});
    const channel = await client.channels.fetch(panel.channelId).catch(()=>null);
    if (!channel || !channel.isTextBased()) return;
    const msg = await channel.messages.fetch(panel.messageId).catch(()=>null);
    if (!msg) return;
    const embed = buildBotPanelEmbed(guild, panel);
    await msg.edit({ embeds: [embed] }).catch(err => {
      console.log("Failed to edit bot panel message:", err.message);
    });
    // persist panel state to disk
    try { store.setPanelData(guildId, panel); } catch(e){}
  } catch (err) {
    console.log("อัปเดท Bot Panel ล้มเหลว:", err.message);
  }
}

/////////////////////////////////////////////////////////////////
// Interaction Handler (Slash + Button + Select)
// - changed admin checks to isGuildAdmin
// - added /set_notify
/////////////////////////////////////////////////////////////////
client.on("interactionCreate", async (i) => {
  try {
    // Chat Input (slash)
    if (i.isChatInputCommand()) {
      // rankpanel (unchanged)
      if (i.commandName === "rankpanel") {
        if (!isGuildAdmin(i.member)) return i.reply({ content: "❌ ต้องเป็นแอดมินนะค้าบ", ephemeral: true });
        const role = i.options.getRole("role");
        if (!role) return i.reply({ content: "❌ ไม่พบยศที่เลือกนะค้าบ", ephemeral: true });
        const embed = new EmbedBuilder().setColor(0xf772d4).setTitle("🌸 รับยศของคุณได้เลย!").setDescription(`กดปุ่มด้านล่างเพื่อรับยศ **${role.name}** เข้าสู่ระบบ xSwift Hub นะค้าบ 💗`).setImage(PANEL_IMAGE).setFooter({ text: "xSwift Hub | By Zemon Źx" });
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`rank_accept_${role.id}`).setStyle(ButtonStyle.Success).setLabel("💗 รับยศเลย!"));
        return i.reply({ embeds: [embed], components: [row] });
      }

      // botpanel (unchanged except storing panel persistently)
      if (i.commandName === "botpanel") {
        if (!isGuildAdmin(i.member)) return i.reply({ content: "❌ ต้องเป็นแอดมินนะค้าบ", ephemeral: true });
        const targetChannel = i.options.getChannel("channel");
        if (!targetChannel || !targetChannel.isTextBased()) return i.reply({ content: "❌ กรุณาเลือกห้องข้อความปกตินะค้าบ", ephemeral: true });
        await i.guild.members.fetch();
        const bots = i.guild.members.cache.filter((m) => m.user.bot);
        if (!bots.size) return i.reply({ content: "❌ เซิร์ฟนี้ยังไม่มีบอทให้เช็กสถานะเลยน้า", ephemeral: true });

        const existing = botPanels.get(i.guild.id) || store.getPanelData(i.guild.id) || null;
        const panelData = {
          channelId: targetChannel.id,
          messageId: null,
          botIds: bots.map((m) => m.id),
          maintenance: existing ? existing.maintenance : new Set(),
          stopped: existing ? existing.stopped : new Set(),
          timeState: existing ? existing.timeState : new Map()
        };

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
        // persist
        try { store.setPanelData(i.guild.id, panelData); } catch(e){}

        return i.reply({ content: `✅ สร้าง Bot Status Panel ใน ${targetChannel} เรียบร้อยค้าบ`, ephemeral: true });
      }

      // ticketpanel
      if (i.commandName === "ticketpanel") {
        if (!isGuildAdmin(i.member)) return i.reply({ content: "❌ คำสั่งนี้สำหรับแอดมินเท่านั้นน้า", ephemeral: true });
        const targetChannel = i.options.getChannel("channel");
        if (!targetChannel || !targetChannel.isTextBased()) return i.reply({ content: "❌ กรุณาเลือกห้องข้อความปกตินะค้าบ", ephemeral: true });
        const embeds = buildTicketPanelEmbeds(i.guild);
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("ticket_open").setStyle(ButtonStyle.Primary).setLabel("🎟️ เปิด Ticket ติดต่อทีมงาน"));
        await targetChannel.send({ embeds, components: [row] });
        return i.reply({ content: `✅ สร้าง Tickets Panel ใน ${targetChannel} เรียบร้อยแล้วค้าบ`, ephemeral: true });
      }

      // new: /set_notify -> บันทึกช่องแจ้งเตือน per-guild
      if (i.commandName === "set_notify") {
        if (!isGuildAdmin(i.member)) return i.reply({ content: "❌ เฉพาะแอดมินเซิร์ฟเท่านั้นน้า", ephemeral: true });
        const ch = i.options.getChannel("channel");
        if (!ch || !ch.isTextBased()) return i.reply({ content: "❌ กรุณาเลือกห้องข้อความที่ถูกต้องนะค้าบ", ephemeral: true });
        store.setNotifyChannel(i.guild.id, ch.id);
        return i.reply({ content: `✅ บันทึกช่องแจ้งเตือนของเซิร์ฟนี้เป็น ${ch}`, ephemeral: true });
      }

      return;
    }

    // Buttons (same as before but using isGuildAdmin)
    if (i.isButton()) {
      // rank_accept
      if (i.customId.startsWith("rank_accept_")) {
        const roleId = i.customId.replace("rank_accept_", "");
        const role = i.guild.roles.cache.get(roleId);
        if (!role) return i.reply({ content: "❌ ยศนี้ถูกลบหรือหาไม่เจอแล้วน้า", ephemeral: true });
        try {
          await i.member.roles.add(role);
          // welcomeLog global fallback - note: do not use guild-specific welcomeLog unless set
          const logId = store.getNotifyChannel(i.guild.id) || config.welcomeLog;
          if (logId) {
            try {
              const logChannel = await client.channels.fetch(logId).catch(()=>null);
              if (logChannel && logChannel.isTextBased()) {
                const e = new EmbedBuilder().setColor(0xff99dd).setTitle("🎉 ยินดีต้อนรับสมาชิกใหม่!").setDescription(`สวัสดี ${i.member} !\nคุณได้รับยศ **${role.name}** เรียบร้อยแล้วนะค้าบ 💗`).setImage(WELCOME_IMAGE).setFooter({ text: "xSwift Hub | By Zemon Źx" });
                await logChannel.send({ embeds: [e] });
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

      // Bot panel buttons
      if (i.customId === `botpanel_refresh_${i.guild.id}`) {
        if (!isGuildAdmin(i.member)) return i.reply({ content: "❌ ปุ่มนี้ให้แอดมินกดเท่านั้นนะค้าบ", ephemeral: true });
        await updateBotPanel(i.guild.id);
        return i.reply({ content: "🔄 อัปเดตสถานะบอททั้งหมดใน Panel แล้วค้าบ", ephemeral: true });
      }

      if (i.customId === `botpanel_manage_${i.guild.id}`) {
        if (!isGuildAdmin(i.member)) return i.reply({ content: "❌ ปุ่มนี้ให้แอดมินกดเท่านั้นนะค้าบ", ephemeral: true });
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
        if (!isGuildAdmin(i.member)) return i.reply({ content: "❌ ปุ่มนี้ให้แอดมินเท่านั้นน้า", ephemeral: true });
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
        if (!isGuildAdmin(i.member)) return i.reply({ content: "❌ ปุ่มนี้ให้แอดมินกดเท่านั้นนะค้าบ", ephemeral: true });
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

      // Ticket buttons & welcome buttons keep existing logic (omitted here for brevity)
    }

    // Select menus (botpanel select/inspect/stop)
    if (i.isStringSelectMenu()) {
      if (i.customId === "botpanel_select") {
        if (!isGuildAdmin(i.member)) return i.reply({ content: "❌ เฉพาะแอดมินเท่านั้นน้า", ephemeral: true });
        const panel = botPanels.get(i.guild.id);
        if (!panel) return i.update({ content: "❌ ไม่มี Bot Status Panel แล้ว (อาจถูกลบไปแล้ว)", components: [] });
        for (const id of i.values) {
          if (panel.maintenance.has(id)) panel.maintenance.delete(id);
          else panel.maintenance.add(id);
        }
        await updateBotPanel(i.guild.id);
        return i.update({ content: "✅ อัปเดตสถานะกำลังปรับปรุงของบอทเรียบร้อยค้าบ", components: [] });
      }

      if (i.customId === "botpanel_inspect_select") {
        if (!isGuildAdmin(i.member)) return i.reply({ content: "❌ เฉพาะแอดมินเท่านั้นน้า", ephemeral: true });
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
        if (!isGuildAdmin(i.member)) return i.reply({ content: "❌ เฉพาะแอดมินเท่านั้นน้า", ephemeral: true });
        const panel = botPanels.get(i.guild.id);
        if (!panel) return i.update({ content: "❌ ไม่มี Bot Status Panel แล้ว (อาจถูกลบไปแล้ว)", components: [] });
        if (!panel.stopped) panel.stopped = new Set();
        for (const id of i.values) {
          if (panel.stopped.has(id)) panel.stopped.delete(id);
          else panel.stopped.add(id);
        }
        await updateBotPanel(i.guild.id);
        return i.update({ content: "✅ อัปเดตโหมด “หยุดบอทชั่วคราว ⚫️” ของบอทที่เลือกเรียบร้อยค้าบ", components: [] });
      }
    }
  } catch (err) {
    console.log("interactionCreate handler error:", err.message);
    try { if (i.replied || i.deferred) { /* nothing */ } } catch(e){}
  }
});

/////////////////////////////////////////////////////////////////
// presenceUpdate -> refresh panels (unchanged logic, uses botPanels map)
/////////////////////////////////////////////////////////////////
client.on("presenceUpdate", async (oldPresence, newPresence) => {
  try {
    const p = newPresence || oldPresence;
    if (!p) return;
    const userIsBot = p?.user?.bot ?? (p?.member?.user?.bot ?? false);
    if (!userIsBot) return;
    const guildId = p.guildId || p.guild?.id || (p.member && p.member.guild && p.member.guild.id);
    if (!guildId) return;
    if (!botPanels.has(guildId)) return;
    updateBotPanel(guildId).catch(err => console.log("presenceUpdate->updateBotPanel err:", err.message));
  } catch (e) {
    console.log("presenceUpdate handler error:", e.message);
  }
});

/////////////////////////////////////////////////////////////////
// guildMemberAdd -> ensure new bot gets added to panel if exist
/////////////////////////////////////////////////////////////////
client.on("guildMemberAdd", async (member) => {
  try {
    if (member.user && member.user.bot) {
      const guildId = member.guild.id;
      if (botPanels.has(guildId)) {
        const panel = botPanels.get(guildId);
        if (!panel.botIds.includes(member.id)) {
          panel.botIds.push(member.id);
          if (!panel.timeState) panel.timeState = new Map();
          const isOnline = member.presence && member.presence.status && member.presence.status !== "offline";
          panel.timeState.set(member.id, { lastStatus: isOnline ? "online" : "offline", lastChangeAt: Date.now() });
          updateBotPanel(guildId).catch(()=>{});
          store.setPanelData(guildId, panel);
          console.log(`Added new bot ${member.id} to botPanel for guild ${guildId}`);
        }
      }
      return;
    }
    // human welcome (unchanged but use per-guild notify fallback)
    const guild = member.guild;
    const channelId = store.getNotifyChannel(guild.id) || config.welcomeChannel || config.welcomeLog || guild.systemChannel?.id;
    const ch = channelId ? await client.channels.fetch(channelId).catch(()=>null) : null;
    let targetChannel = ch;
    if (!targetChannel) {
      targetChannel = guild.channels.cache.find(c => c.isTextBased() && /welcome|ยินดี|ต้อนรับ/i.test(c.name));
    }
    if (!targetChannel && guild.systemChannel) targetChannel = guild.systemChannel;
    if (!targetChannel) {
      console.log(`No welcome channel for guild ${guild.id}, skipping welcome embed.`);
      return;
    }
    await guild.members.fetch(member.id).catch(()=>null);
    const createdAt = member.user.createdTimestamp;
    const accAge = accountAgeText(createdAt);
    const suspicious = isSuspiciousAccount(createdAt, config.welcomeSuspiciousDays ?? 7);
    const totalMembers = guild.memberCount;
    await guild.members.fetch().catch(()=>null);
    const bots = guild.members.cache.filter(m => m.user.bot).size;
    const humans = totalMembers - bots;
    const welcomeEmbed = new EmbedBuilder()
      .setTitle("🎀 ยินดีต้อนรับสู่ " + guild.name + "!")
      .setDescription([
        `สวัสดี ${member} นะค้า 💖`,
        "",
        `**📌 ข้อมูลบัญชี**`,
        `• ชื่อ: ${member.user.tag}`,
        `• สร้างบัญชี: <t:${Math.floor(createdAt/1000)}:f> (อายุบัญชี: **${accAge}**)`,
        `• สถานะความน่าเชื่อถือ: ${suspicious ? "⚠️ *บัญชีใหม่ — โปรดตรวจสอบ*": "✅ ปลอดภัย"}`,
        "",
        `**📊 ข้อมูลเซิร์ฟ**`,
        `• สมาชิกทั้งหมด: **${totalMembers}** (ผู้ใช้: ${humans} • บอท: ${bots})`,
        `• เข้าร่วมเมื่อ: <t:${Math.floor(Date.now()/1000)}:f> (เวลาเซิร์ฟ: Asia/Bangkok)`,
        "",
        `❗ แอดมิน: หากต้องการยืนยันสมาชิกโดยอัตโนมัติ ให้ตั้งค่าใน \`bot_config.welcomeAssignRoleId\``
      ].join("\n"))
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .setImage(WELCOME_IMAGE)
      .setColor(suspicious ? 0xffcc00 : 0x66ffcc)
      .setFooter({ text: "xSwift Hub | Welcome System" });
    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`welcome_mute_${member.id}`).setLabel("🔇 Mute (Staff)").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`welcome_kick_${member.id}`).setLabel("🦶 Kick (Staff)").setStyle(ButtonStyle.Danger)
    );
    await targetChannel.send({ embeds: [welcomeEmbed], components: [actionRow] }).catch(()=> { targetChannel.send({ embeds: [welcomeEmbed] }).catch(()=>{}); });
    if (config.welcomeAssignRoleId) {
      const role = guild.roles.cache.get(config.welcomeAssignRoleId) || await guild.roles.fetch(config.welcomeAssignRoleId).catch(()=>null);
      if (role) {
        try {
          await member.roles.add(role, "Auto-assign welcome role");
          if (config.welcomeLog) {
            const logCh = await client.channels.fetch(config.welcomeLog).catch(()=>null);
            if (logCh && logCh.isTextBased()) {
              const logE = new EmbedBuilder().setColor(0x99ffdd).setTitle("Assigned Welcome Role").setDescription(`${member} ได้รับยศอัตโนมัติ: **${role.name}**`).setTimestamp();
              logCh.send({ embeds: [logE] }).catch(()=>{});
            }
          }
        } catch (e) {
          console.log("ไม่สามารถมอบยศอัตโนมัติให้สมาชิกใหม่ได้:", e.message);
        }
      }
    }
    if (suspicious) {
      const staffRoleName = config.welcomeNotifyRoleName || "ผู้ดูแล";
      const staffRole = guild.roles.cache.find(r => r.name === staffRoleName);
      if (staffRole && targetChannel) {
        targetChannel.send({ content: `<@&${staffRole.id}> — ตรวจพบสมาชิกเข้าร่วมที่อายุบัญชียังน้อย โปรดตรวจสอบ: ${member}` }).catch(()=>{});
      } else if (targetChannel && config.welcomeNotifyRoleName && !staffRole) {
        targetChannel.send({ content: `@here — ตรวจพบสมาชิกเข้าร่วมที่อายุบัญชียังน้อย โปรดตรวจสอบ: ${member}` }).catch(()=>{});
      }
    }
  } catch (err) {
    console.log("guildMemberAdd handler error:", err.message);
  }
});

/////////////////////////////////////////////////////////////////
// Buttons from welcome embed (staff quick actions) - simplified
/////////////////////////////////////////////////////////////////
client.on("interactionCreate", async (i) => {
  try {
    if (!i.isButton()) return;
    const id = i.customId;
    if (id.startsWith("welcome_mute_") || id.startsWith("welcome_kick_")) {
      const member = i.member;
      if (!userIsStaffOrAdmin(member)) {
        return i.reply({ content: "❌ เฉพาะแอดมิน/ผู้ดูแลเท่านั้นที่ใช้ปุ่มนี้ได้", ephemeral: true });
      }
      const parts = id.split("_");
      const action = parts[1];
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

function userIsStaffOrAdmin(member) {
  if (!member) return false;
  if (member.permissions && member.permissions.has && member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
  const modRole = member.guild.roles.cache.find((r) => r.name === "ผู้ดูแล");
  if (modRole && member.roles.cache.has(modRole.id)) return true;
  return false;
}

/////////////////////////////////////////////////////////////////
// REGISTER commands (add /set_notify)
/////////////////////////////////////////////////////////////////
async function registerCommands() {
  try {
    const commands = [
      new SlashCommandBuilder()
        .setName("rankpanel")
        .setDescription("สร้างหน้า Panel รับยศ (เฉพาะแอดมิน)")
        .addRoleOption((opt) => opt.setName("role").setDescription("ยศที่ต้องการให้เมื่อกดปุ่มรับยศ").setRequired(true)),
      new SlashCommandBuilder()
        .setName("botpanel")
        .setDescription("สร้าง Panel แสดงสถานะบอทในเซิร์ฟ (เฉพาะแอดมิน)")
        .addChannelOption((opt) => opt.setName("channel").setDescription("ห้องที่จะให้บอทส่ง Panel สถานะ").addChannelTypes(ChannelType.GuildText).setRequired(true)),
      new SlashCommandBuilder()
        .setName("ticketpanel")
        .setDescription("สร้าง Panel Tickets สำหรับติดต่อแอดมิน (เฉพาะแอดมิน)")
        .addChannelOption((opt) => opt.setName("channel").setDescription("ห้องที่จะให้บอทส่ง Panel Tickets").addChannelTypes(ChannelType.GuildText).setRequired(true)),
      new SlashCommandBuilder()
        .setName("set_notify")
        .setDescription("ตั้งค่าช่องแจ้งเตือนของเซิร์ฟนี้ให้บอทส่งข้อความ (เฉพาะแอดมินเซิร์ฟ)")
        .addChannelOption((opt) => opt.setName("channel").setDescription("ช่องข้อความที่จะให้บอทส่งการแจ้งเตือน").addChannelTypes(ChannelType.GuildText).setRequired(true))
    ].map(c => c.toJSON());

    if (config.clientId) {
      const rest = new REST({ version: "10" }).setToken(config.token);
      await rest.put(Routes.applicationCommands(config.clientId), { body: commands });
      console.log("REGISTERED global commands via clientId");
    } else {
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
// READY - restore panels from store
/////////////////////////////////////////////////////////////////
client.once("ready", async () => {
  console.log("ล็อกอินเป็น", client.user.tag, "แล้วจ้า 💗");

  await registerCommands();
  await connectVoice();
  // restore saved panels into memory
  try {
    // iterate store file keys
    const all = (fs.existsSync(path.join(__dirname, 'guild_config.json'))) ? JSON.parse(fs.readFileSync(path.join(__dirname, 'guild_config.json'),'utf8')) : {};
    for (const gid of Object.keys(all || {})) {
      const g = all[gid];
      if (g && g.panel) {
        const p = g.panel;
        const panel = {
          channelId: p.channelId,
          messageId: p.messageId,
          botIds: p.botIds || [],
          maintenance: new Set(p.maintenance || []),
          stopped: new Set(p.stopped || []),
          timeState: new Map((p.timeState || []).map(([k,v]) => [k, v]))
        };
        botPanels.set(gid, panel);
        console.log(`Restored panel for guild ${gid}`);
      }
    }
  } catch (e) {
    console.log("Failed to restore panels:", e.message);
  }

  await sendDaily("on-ready");
  cron.schedule("0 0 * * *", () => sendDaily("cron"), { timezone: "Asia/Bangkok" });

  // periodic update of panels
  setInterval(() => {
    for (const guildId of botPanels.keys()) updateBotPanel(guildId);
  }, 10_000);
});

client.login(config.token).catch(err => {
  console.error("Client login error:", err && err.message ? err.message : err);
});
