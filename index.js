// index.js - MASTER ULTRA VERSION + RANK PANEL SYSTEM (ROLE OPTION) + BOT STATUS PANEL
// (xSwift Hub | By Zemon Źx)
// ------------------------------------------------------------

const express = require("express");
const app = express();
const port = process.env.PORT || 8080;

app.get("/", (req, res) => res.send("Thai Calendar Bot is Alive 💗"));
app.listen(port, () => console.log("Web server running on port", port));

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

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildVoiceStates
  ]
});

/////////////////////////////////////////////////////////////////
// Util Thai Time
/////////////////////////////////////////////////////////////////
function getThaiDate() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
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

/////////////////////////////////////////////////////////////////
// Names
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

/////////////////////////////////////////////////////////////////
// Colors
/////////////////////////////////////////////////////////////////
const colorOfDay = {
  0: { name: "สีแดง", emoji: "❤️" },
  1: { name: "สีเหลือง", emoji: "💛" },
  2: { name: "สีชมพู", emoji: "💗" },
  3: { name: "สีเขียว", emoji: "💚" },
  4: { name: "สีส้ม", emoji: "🧡" },
  5: { name: "สีฟ้า", emoji: "💙" },
  6: { name: "สีม่วง", emoji: "💜" }
};

/////////////////////////////////////////////////////////////////
// Circle Numbers ➊➋➌
/////////////////////////////////////////////////////////////////
const circleNum = [
  "➊",
  "➋",
  "➌",
  "➍",
  "➎",
  "➏",
  "➐",
  "➑",
  "➒",
  "➓",
  "➊➊",
  "➊➋",
  "➊➌",
  "➊➍",
  "➊➎",
  "➊➏",
  "➊➐",
  "➊➑",
  "➊➒",
  "➋➓",
  "➋➊",
  "➋➋",
  "➋➌",
  "➋➍",
  "➋➎",
  "➋➏",
  "➋➐",
  "➋➑",
  "➋➒",
  "➌➓"
];
const circle = (n) => (n >= 1 && n <= 31 ? circleNum[n - 1] : String(n));

/////////////////////////////////////////////////////////////////
// Festival System
/////////////////////////////////////////////////////////////////
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
  const mmdd =
    String(m).padStart(2, "0") + "-" + String(dd).padStart(2, "0");
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

/////////////////////////////////////////////////////////////////
// Calendar Builder
/////////////////////////////////////////////////////////////////
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
      row.push(
        (cur === d ? circle(cur) : String(cur)).padStart(2, " ") + " "
      );
      cur++;
    }
  }
  lines.push(row.join(""));

  while (cur <= days) {
    row = [];
    for (let i = 0; i < 7; i++) {
      if (cur > days) {
        row.push("   ");
      } else {
        row.push(
          (cur === d ? circle(cur) : String(cur)).padStart(2, " ") + " "
        );
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

/////////////////////////////////////////////////////////////////
// Embed for Calendar
/////////////////////////////////////////////////////////////////
const IMAGE_URL =
  "https://cdn.discordapp.com/attachments/1443746157082706054/1447963237919227934/Unknown.gif";

function buildEmbed(date) {
  const cal = generateCalendar(date);
  const color = colorOfDay[date.getDay()];
  const specials = getSpecialThaiDays(date).join(" • ");

  const header =
    `✨ ปฏิทินไทยประจำวัน ✨
วันนี้เป็น ${cal.weekdayName} ที่ ${cal.day} ${cal.monthName} พ.ศ. ${cal.be}

🎨 สีประจำวัน : ${color.name} ${color.emoji}
📅 วันนี้ : ${specials}
….::::•°✾°•::::….….::::•°✾°•::::….
`;

  return new EmbedBuilder()
    .setColor(0xff66cc)
    .setDescription(
      header +
        "```txt\n" +
        cal.text +
        "\n```\n🪷 วันสำคัญวันนี้ : " +
        specials
    )
    .setImage(IMAGE_URL)
    .setFooter({
      text: "Credit ˚₊·➳❥ By Zemon Źx | xSwift Hub"
    });
}

/////////////////////////////////////////////////////////////////
// DAILY SEND
/////////////////////////////////////////////////////////////////
let lastSent = null;

async function sendDaily(reason) {
  try {
    const ch = await client.channels.fetch(config.channelId);
    const now = getThaiDate();
    const today = keyDate(now);

    if (lastSent === today) return;
    lastSent = today;

    await ch.send({ content: "@everyone", embeds: [buildEmbed(now)] });
    console.log("ส่งปฏิทินแล้ว:", today, reason);
  } catch (e) {
    console.error("ส่งปฏิทินผิดพลาด:", e);
  }
}

/////////////////////////////////////////////////////////////////
// VOICE (STATIC JOIN IF CONFIGURED)
/////////////////////////////////////////////////////////////////
async function connectVoice() {
  if (!process.env.VOICE_ID) return;
  try {
    const ch = await client.channels.fetch(process.env.VOICE_ID);
    if (!ch.isVoiceBased()) return;

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
// ⚡ RANK PANEL SYSTEM (ROLE OPTION)
//  /rankpanel role:@ยศ
/////////////////////////////////////////////////////////////////
const PANEL_IMAGE =
  "https://cdn.discordapp.com/attachments/1445301442092072980/1448043469015613470/IMG_4817.gif";
const WELCOME_IMAGE =
  "https://cdn.discordapp.com/attachments/1445301442092072980/1448043511558570258/1be0c476c8a40fbe206e2fbc6c5d213c.jpg";

/////////////////////////////////////////////////////////////////
// ⚡ BOT STATUS PANEL IMAGES
/////////////////////////////////////////////////////////////////
const STATUS_PANEL_IMAGE =
  "https://cdn.discordapp.com/attachments/1443746157082706054/1448123647524081835/Unknown.gif";
const STATUS_PANEL_ICON =
  "https://cdn.discordapp.com/attachments/1443746157082706054/1448123939250507887/CFA9E582-8035-4C58-9A79-E1269A5FB025.png";

/////////////////////////////////////////////////////////////////
// Slash Commands Register
/////////////////////////////////////////////////////////////////
async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName("rankpanel")
      .setDescription("สร้างหน้า Panel รับยศ (เฉพาะแอดมิน)")
      .addRoleOption((opt) =>
        opt
          .setName("role")
          .setDescription("ยศที่ต้องการให้เมื่อกดปุ่มรับยศ")
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName("botpanel")
      .setDescription("สร้าง Panel แสดงสถานะบอทในเซิร์ฟ (เฉพาะแอดมิน)")
      .addChannelOption((opt) =>
        opt
          .setName("channel")
          .setDescription("ห้องที่จะให้บอทส่ง Panel สถานะ")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)
      )
  ].map((c) => c.toJSON());

  const rest = new REST({ version: "10" }).setToken(config.token);
  await rest.put(Routes.applicationCommands(client.user.id), {
    body: commands
  });
  console.log("REGISTERED /rankpanel + /botpanel");
}

/////////////////////////////////////////////////////////////////
// BOT STATUS PANEL DATA
/////////////////////////////////////////////////////////////////
// guildId -> {
//   channelId,
//   messageId,
//   botIds,
//   maintenance: Set<botId>,
//   stopped: Set<botId>,
//   timeState: Map<botId, { lastStatus: 'online' | 'offline', lastChangeAt: number }>
// }
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
  if (!panelData.timeState) {
    panelData.timeState = new Map();
  }
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

// ✅ ปรับหน้าตาข้อความใน Panel ตรงนี้อย่างเดียว (ตอนนี้อัปเกรดตามสเปกใหม่แล้ว)
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
    const isOnline =
      presence && presence.status && presence.status !== "offline";

    const inMaintenance = panelData.maintenance.has(botId);
    const isStopped = panelData.stopped.has(botId);

    // อัปเดตสถานะเวลา
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

    // สถานะ + โหมด
    let statusLine;
    let modeLine;
    if (isStopped) {
      statusLine = isOnline
        ? "🛰 สถานะ : ออนไลน์อยู่ 🟢"
        : "🛰 สถานะ : ออฟไลน์อยู่ 🔴";
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

    // กำลังทำอะไรอยู่
    let doingLine;
    const vs = member?.voice;
    if (isOnline && vs?.channel) {
      doingLine = `กำลัง : ออนห้องเสียง ${vs.channel.toString()} 🎧`;
    } else if (isOnline) {
      doingLine = "กำลัง : ว่างอยู่ รอซีม่อน 💖";
    } else if (inMaintenance) {
      doingLine = "กำลัง : แก้ไขปรับปรุงอีกนิด 🪛";
    } else if (isStopped) {
      doingLine = "กำลัง : หยุดทำงานชั่วคราว ⏸️";
    } else {
      doingLine = "กำลัง : ออฟไลน์อยู่พักผ่อนแป๊บนึง 😴";
    }

    const onlineLine = "บอทออนไลน์ : " + formatHMS(onlineMs) + " ⏰";
    const offlineLine = "บอทออฟไลน์ : " + formatHMS(offlineMs) + " 🕰️";

    blocks.push(
      `**${index}. ${mention}**\n` +
        `${statusLine}\n` +
        `${modeLine}\n` +
        `${doingLine}\n` +
        `${onlineLine}\n` +
        `${offlineLine}`
    );
    index++;
  }

  const desc =
    `🛰️ สถานะบอทในเซิร์ฟเวอร์ **${guild.name}**\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    blocks.join("\n\n") +
    `\n\n> ใช้ปุ่มด้านล่างสำหรับแอดมินในการอัปเดต เช็ค และจัดการสถานะบอทแต่ละตัวแบบเรียลไทม์นะค้าบ 💗`;

  return new EmbedBuilder()
    .setColor(0x00ffc8)
    .setTitle("🌸 xSwift Hub | Bot Status Panel")
    .setDescription(desc)
    .setImage(STATUS_PANEL_IMAGE)
    .setThumbnail(STATUS_PANEL_ICON)
    .setFooter({
      text: "อัปเดตสถานะอัตโนมัติทุก ๆ 10 วินาที • By Zemon Źx"
    });
}

async function updateBotPanel(guildId) {
  const panel = botPanels.get(guildId);
  if (!panel) return;

  try {
    const guild = await client.guilds.fetch(guildId);
    await guild.members.fetch({ user: panel.botIds });

    const channel = await client.channels.fetch(panel.channelId);
    if (!channel || !channel.isTextBased()) return;

    const msg = await channel.messages.fetch(panel.messageId);
    const embed = buildBotPanelEmbed(guild, panel);

    await msg.edit({ embeds: [embed] });
  } catch (err) {
    console.log("อัปเดต Bot Panel ล้มเหลว:", err.message);
  }
}

/////////////////////////////////////////////////////////////////
// Interaction Handler (Slash + Button + Select)
/////////////////////////////////////////////////////////////////
client.on("interactionCreate", async (i) => {
  // Slash Commands
  if (i.isChatInputCommand()) {
    // ===== /rankpanel =====
    if (i.commandName === "rankpanel") {
      if (
        !i.member.permissions.has(PermissionsBitField.Flags.Administrator)
      ) {
        return i.reply({
          content: "❌ ต้องเป็นแอดมินนะค้าบ",
          ephemeral: true
        });
      }

      const role = i.options.getRole("role");
      if (!role) {
        return i.reply({
          content: "❌ ไม่พบยศที่เลือกนะค้าบ",
          ephemeral: true
        });
      }

      const embed = new EmbedBuilder()
        .setColor(0xf772d4)
        .setTitle("🌸 รับยศของคุณได้เลย!")
        .setDescription(
          `กดปุ่มด้านล่างเพื่อรับยศ **${role.name}** เข้าสู่ระบบ xSwift Hub นะค้าบ 💗`
        )
        .setImage(PANEL_IMAGE)
        .setFooter({ text: "xSwift Hub | By Zemon Źx" });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`rank_accept_${role.id}`)
          .setStyle(ButtonStyle.Success)
          .setLabel("💗 รับยศเลย!")
      );

      return i.reply({ embeds: [embed], components: [row] });
    }

    // ===== /botpanel =====
    if (i.commandName === "botpanel") {
      if (
        !i.member.permissions.has(PermissionsBitField.Flags.Administrator)
      ) {
        return i.reply({
          content: "❌ ต้องเป็นแอดมินนะค้าบ",
          ephemeral: true
        });
      }

      const targetChannel = i.options.getChannel("channel");
      if (!targetChannel || !targetChannel.isTextBased()) {
        return i.reply({
          content: "❌ กรุณาเลือกห้องข้อความปกตินะค้าบ",
          ephemeral: true
        });
      }

      await i.guild.members.fetch();
      const bots = i.guild.members.cache.filter((m) => m.user.bot);

      if (!bots.size) {
        return i.reply({
          content: "❌ เซิร์ฟนี้ยังไม่มีบอทให้เช็กสถานะเลยน้า",
          ephemeral: true
        });
      }

      const panelData = {
        channelId: targetChannel.id,
        messageId: null,
        botIds: bots.map((m) => m.id),
        maintenance: new Set(),
        stopped: new Set(),
        timeState: new Map()
      };

      const embed = buildBotPanelEmbed(i.guild, panelData);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`botpanel_refresh_${i.guild.id}`)
          .setStyle(ButtonStyle.Primary)
          .setLabel("🔄 อัปเดตสถานะ"),
        new ButtonBuilder()
          .setCustomId(`botpanel_manage_${i.guild.id}`)
          .setStyle(ButtonStyle.Secondary)
          .setLabel("🛠️ ตั้งสถานะปรับปรุง"),
        new ButtonBuilder()
          .setCustomId(`botpanel_inspect_${i.guild.id}`)
          .setStyle(ButtonStyle.Secondary)
          .setLabel("📊 เช็คบอท"),
        new ButtonBuilder()
          .setCustomId(`botpanel_stop_${i.guild.id}`)
          .setStyle(ButtonStyle.Danger)
          .setLabel("⏹️ หยุดทำงาน")
      );

      const msg = await targetChannel.send({
        embeds: [embed],
        components: [row]
      });

      panelData.messageId = msg.id;
      botPanels.set(i.guild.id, panelData);

      return i.reply({
        content: `✅ สร้าง Bot Status Panel ใน ${targetChannel} เรียบร้อยค้าบ`,
        ephemeral: true
      });
    }

    return;
  }

  // Buttons
  if (i.isButton()) {
    // ===== ปุ่มรับยศ =====
    if (i.customId.startsWith("rank_accept_")) {
      const roleId = i.customId.replace("rank_accept_", "");
      const role = i.guild.roles.cache.get(roleId);
      if (!role) {
        return i.reply({
          content: "❌ ยศนี้ถูกลบหรือหาไม่เจอแล้วน้า",
          ephemeral: true
        });
      }

      try {
        await i.member.roles.add(role);

        if (config.welcomeLog) {
          try {
            const logChannel = await client.channels.fetch(
              config.welcomeLog
            );
            if (logChannel && logChannel.isTextBased()) {
              const e = new EmbedBuilder()
                .setColor(0xff99dd)
                .setTitle("🎉 ยินดีต้อนรับสมาชิกใหม่!")
                .setDescription(
                  `สวัสดี ${i.member} !\nคุณได้รับยศ **${role.name}** เรียบร้อยแล้วนะค้าบ 💗\nขอให้สนุกไปกับ xSwift Hub น้าา 🌸`
                )
                .setImage(WELCOME_IMAGE)
                .setFooter({ text: "xSwift Hub | By Zemon Źx" });

              await logChannel.send({ embeds: [e] });
            }
          } catch (err) {
            console.log(
              "ส่งข้อความห้อง welcomeLog ไม่สำเร็จ:",
              err.message
            );
          }
        }

        return i.reply({
          content: "💗 รับยศเรียบร้อยค้าบ!",
          ephemeral: true
        });
      } catch (err) {
        console.error("ให้ยศไม่สำเร็จ:", err);
        return i.reply({
          content: "❌ ให้ยศไม่สำเร็จ ลองใหม่อีกครั้งน้า",
          ephemeral: true
        });
      }
    }

    // ===== ปุ่ม Bot Panel: refresh / manage / inspect / stop =====
    if (i.customId === `botpanel_refresh_${i.guild.id}`) {
      if (
        !i.member.permissions.has(PermissionsBitField.Flags.Administrator)
      ) {
        return i.reply({
          content: "❌ ปุ่มนี้ให้แอดมินกดเท่านั้นนะค้าบ",
          ephemeral: true
        });
      }

      await updateBotPanel(i.guild.id);
      return i.reply({
        content: "🔄 อัปเดตสถานะบอททั้งหมดใน Panel แล้วค้าบ",
        ephemeral: true
      });
    }

    if (i.customId === `botpanel_manage_${i.guild.id}`) {
      if (
        !i.member.permissions.has(PermissionsBitField.Flags.Administrator)
      ) {
        return i.reply({
          content: "❌ ปุ่มนี้ให้แอดมินกดเท่านั้นนะค้าบ",
          ephemeral: true
        });
      }

      const panel = botPanels.get(i.guild.id);
      if (!panel) {
        return i.reply({
          content:
            "❌ ยังไม่มี Bot Status Panel สำหรับเซิร์ฟนี้นะ ลองใช้คำสั่ง /botpanel ก่อนน้า",
          ephemeral: true
        });
      }

      const options = panel.botIds
        .map((id) => {
          const member = i.guild.members.cache.get(id);
          const label = member ? member.user.username : `Bot ${id}`;
          const inMaint = panel.maintenance.has(id);
          return {
            label,
            value: id,
            description: inMaint
              ? "ยกเลิกสถานะกำลังปรับปรุง"
              : "ตั้งให้กำลังปรับปรุง"
          };
        })
        .slice(0, 25);

      const select = new StringSelectMenuBuilder()
        .setCustomId("botpanel_select")
        .setPlaceholder("เลือกบอทที่จะสลับสถานะ 🛠️ / ปกติ")
        .addOptions(options);

      const row = new ActionRowBuilder().addComponents(select);

      return i.reply({
        content: "เลือกบอทที่ต้องการสลับสถานะกำลังปรับปรุงนะค้าบ 💗",
        components: [row],
        ephemeral: true
      });
    }

    if (i.customId === `botpanel_inspect_${i.guild.id}`) {
      if (
        !i.member.permissions.has(PermissionsBitField.Flags.Administrator)
      ) {
        return i.reply({
          content: "❌ ปุ่มนี้ให้แอดมินเท่านั้นน้า",
          ephemeral: true
        });
      }

      const panel = botPanels.get(i.guild.id);
      if (!panel) {
        return i.reply({
          content:
            "❌ ยังไม่มี Bot Status Panel สำหรับเซิร์ฟนี้นะ ลองใช้คำสั่ง /botpanel ก่อนน้า",
          ephemeral: true
        });
      }

      const options = panel.botIds
        .map((id) => {
          const member = i.guild.members.cache.get(id);
          const label = member ? member.user.username : `Bot ${id}`;
          return {
            label,
            value: id,
            description: "ดูรายละเอียดสถานะบอทตัวนี้"
          };
        })
        .slice(0, 25);

      const select = new StringSelectMenuBuilder()
        .setCustomId("botpanel_inspect_select")
        .setPlaceholder("เลือกบอทที่ต้องการเช็คสถานะ 📊")
        .addOptions(options);

      const row = new ActionRowBuilder().addComponents(select);

      return i.reply({
        content: "เลือกบอทที่ต้องการเช็คสถานะละเอียดเลยค้าบ 💗",
        components: [row],
        ephemeral: true
      });
    }

    if (i.customId === `botpanel_stop_${i.guild.id}`) {
      if (
        !i.member.permissions.has(PermissionsBitField.Flags.Administrator)
      ) {
        return i.reply({
          content: "❌ ปุ่มนี้ให้แอดมินเท่านั้นน้า",
          ephemeral: true
        });
      }

      const panel = botPanels.get(i.guild.id);
      if (!panel) {
        return i.reply({
          content:
            "❌ ยังไม่มี Bot Status Panel สำหรับเซิร์ฟนี้นะ ลองใช้คำสั่ง /botpanel ก่อนน้า",
          ephemeral: true
        });
      }

      const options = panel.botIds
        .map((id) => {
          const member = i.guild.members.cache.get(id);
          const label = member ? member.user.username : `Bot ${id}`;
          const isStopped = panel.stopped.has(id);
          return {
            label,
            value: id,
            description: isStopped
              ? "ยกเลิกโหมดหยุดชั่วคราว"
              : "ตั้งให้หยุดบอทชั่วคราว"
          };
        })
        .slice(0, 25);

      const select = new StringSelectMenuBuilder()
        .setCustomId("botpanel_stop_select")
        .setPlaceholder("เลือกบอทที่จะหยุด / ปลดหยุด ⚫️")
        .addOptions(options);

      const row = new ActionRowBuilder().addComponents(select);

      return i.reply({
        content:
          "เลือกบอทที่ต้องการตั้งโหมด “หยุดบอทชั่วคราว ⚫️” หรือปลดโหมดนี้ได้เลยค้าบ",
        components: [row],
        ephemeral: true
      });
    }

    return;
  }

  // Select Menu
  if (i.isStringSelectMenu()) {
    if (i.customId === "botpanel_select") {
      if (
        !i.member.permissions.has(PermissionsBitField.Flags.Administrator)
      ) {
        return i.reply({
          content: "❌ เฉพาะแอดมินเท่านั้นน้า",
          ephemeral: true
        });
      }

      const panel = botPanels.get(i.guild.id);
      if (!panel) {
        return i.update({
          content: "❌ ไม่มี Bot Status Panel แล้ว (อาจถูกลบไปแล้ว)",
          components: []
        });
      }

      for (const id of i.values) {
        if (panel.maintenance.has(id)) panel.maintenance.delete(id);
        else panel.maintenance.add(id);
      }

      await updateBotPanel(i.guild.id);

      return i.update({
        content: "✅ อัปเดตสถานะกำลังปรับปรุงของบอทเรียบร้อยค้าบ",
        components: []
      });
    }

    if (i.customId === "botpanel_inspect_select") {
      if (
        !i.member.permissions.has(PermissionsBitField.Flags.Administrator)
      ) {
        return i.reply({
          content: "❌ เฉพาะแอดมินเท่านั้นน้า",
          ephemeral: true
        });
      }

      const panel = botPanels.get(i.guild.id);
      if (!panel) {
        return i.update({
          content: "❌ ไม่มี Bot Status Panel แล้ว (อาจถูกลบไปแล้ว)",
          components: []
        });
      }

      const botId = i.values[0];
      const guild = await client.guilds.fetch(i.guild.id);
      await guild.members.fetch({ user: [botId] });
      const member = guild.members.cache.get(botId);

      const presence = member?.presence;
      const isOnline =
        presence && presence.status && presence.status !== "offline";

      const st = panel.timeState
        ? panel.timeState.get(botId)
        : { lastStatus: "offline", lastChangeAt: Date.now() };
      const now = Date.now();
      let onlineMs = 0;
      let offlineMs = 0;
      if (st && st.lastStatus === "online") {
        onlineMs = now - st.lastChangeAt;
      } else if (st) {
        offlineMs = now - st.lastChangeAt;
      }

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`📊 สถานะบอท: ${member ? member.user.username : botId}`)
        .setDescription(
          [
            `👤 บอท: <@${botId}>`,
            `🛰 สถานะ: ${isOnline ? "ออนไลน์ 🟢" : "ออฟไลน์ 🔴"}`,
            `🕒 ออนไลน์ต่อเนื่อง: ${formatHMS(onlineMs)}`,
            `🕰 ออฟไลน์ต่อเนื่อง: ${formatHMS(offlineMs)}`,
            "",
            `📶 Ping ของบอทสถานะ (ตัวนี้): ${client.ws.ping} ms`,
            `⚙ ข้อมูล CPU / RAM ของบอทตัวอื่นไม่สามารถเช็กตรง ๆ จาก Discord API ได้เลยน้า`
          ].join("\n")
        )
        .setFooter({ text: "ข้อมูลที่บอทสถานะเช็กให้ได้แบบเรียลไทม์ 💗" });

      return i.update({
        content: "รายละเอียดสถานะของบอทที่เลือกค้าบ 📊",
        embeds: [embed],
        components: []
      });
    }

    if (i.customId === "botpanel_stop_select") {
      if (
        !i.member.permissions.has(PermissionsBitField.Flags.Administrator)
      ) {
        return i.reply({
          content: "❌ เฉพาะแอดมินเท่านั้นน้า",
          ephemeral: true
        });
      }

      const panel = botPanels.get(i.guild.id);
      if (!panel) {
        return i.update({
          content: "❌ ไม่มี Bot Status Panel แล้ว (อาจถูกลบไปแล้ว)",
          components: []
        });
      }

      if (!panel.stopped) panel.stopped = new Set();

      for (const id of i.values) {
        if (panel.stopped.has(id)) {
          panel.stopped.delete(id);
        } else {
          panel.stopped.add(id);
        }
      }

      await updateBotPanel(i.guild.id);

      return i.update({
        content:
          "✅ อัปเดตโหมด “หยุดบอทชั่วคราว ⚫️” ของบอทที่เลือกเรียบร้อยค้าบ",
        components: []
      });
    }
  }
});

/////////////////////////////////////////////////////////////////
// Presence Update -> Refresh Bot Panel
/////////////////////////////////////////////////////////////////
client.on("presenceUpdate", async (oldP, newP) => {
  const p = newP || oldP;
  if (!p?.user?.bot) return;
  const guildId = p.guild?.id;
  if (!guildId) return;
  if (!botPanels.has(guildId)) return;

  await updateBotPanel(guildId);
});

/////////////////////////////////////////////////////////////////
// READY
/////////////////////////////////////////////////////////////////
client.once("ready", async () => {
  console.log("ล็อกอินเป็น", client.user.tag, "แล้วจ้า 💗");

  await registerCommands();
  await connectVoice();
  await sendDaily("on-ready");

  // ส่งปฏิทินทุกเที่ยงคืน
  cron.schedule("0 0 * * *", () => sendDaily("cron"), {
    timezone: "Asia/Bangkok"
  });

  // อัปเดต Bot Status Panel ทุก ๆ 10 วินาทีแบบ global
  setInterval(() => {
    for (const guildId of botPanels.keys()) {
      updateBotPanel(guildId);
    }
  }, 10_000);
});

client.login(config.token);
