// index.js - MASTER ULTRA ALL-IN-ONE
// Calendar + Rank Panel + Bot Status Panel + Music Panel
// (xSwift Hub | By Zemon Źx)

///////////////////////////////////////////////////////////////
// WEB SERVER (KEEP ALIVE)
///////////////////////////////////////////////////////////////
const express = require("express");
const app = express();
const port = process.env.PORT || 8080;

app.get("/", (req, res) => res.send("xSwift Hub Bot is Alive 💗"));
app.listen(port, () => console.log("Web server running on port", port));

///////////////////////////////////////////////////////////////
// DISCORD IMPORTS
///////////////////////////////////////////////////////////////
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
  ChannelType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");

const {
  joinVoiceChannel,
  entersState,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  NoSubscriberBehavior,
  getVoiceConnection
} = require("@discordjs/voice");

const cron = require("node-cron");
const play = require("play-dl");
const config = require("./bot_config");

///////////////////////////////////////////////////////////////
// CLIENT
///////////////////////////////////////////////////////////////
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildVoiceStates
  ]
});

///////////////////////////////////////////////////////////////
// UTIL – THAI TIME
///////////////////////////////////////////////////////////////
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

///////////////////////////////////////////////////////////////
// THAI NAMES
///////////////////////////////////////////////////////////////
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

///////////////////////////////////////////////////////////////
// COLORS OF DAY
///////////////////////////////////////////////////////////////
const colorOfDay = {
  0: { name: "สีแดง", emoji: "❤️" },
  1: { name: "สีเหลือง", emoji: "💛" },
  2: { name: "สีชมพู", emoji: "💗" },
  3: { name: "สีเขียว", emoji: "💚" },
  4: { name: "สีส้ม", emoji: "🧡" },
  5: { name: "สีฟ้า", emoji: "💙" },
  6: { name: "สีม่วง", emoji: "💜" }
};

///////////////////////////////////////////////////////////////
// CIRCLED NUMBERS ➊➋➌
///////////////////////////////////////////////////////////////
const circleNum = [
  "➊", "➋", "➌", "➍", "➎", "➏", "➐", "➑", "➒",
  "➓", "➊➊", "➊➋", "➊➌", "➊➍", "➊➎", "➊➏",
  "➊➐", "➊➑", "➊➒", "➋➓", "➋➊", "➋➋", "➋➌",
  "➋➍", "➋➎", "➋➏", "➋➐", "➋➑", "➋➒", "➌➓"
];
const circle = n => (n >= 1 && n <= 31 ? circleNum[n - 1] : String(n));

///////////////////////////////////////////////////////////////
// THAI FESTIVAL SYSTEM
///////////////////////////////////////////////////////////////
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

///////////////////////////////////////////////////////////////
// CALENDAR BUILDER
///////////////////////////////////////////////////////////////
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

///////////////////////////////////////////////////////////////
// CALENDAR EMBED
///////////////////////////////////////////////////////////////
const IMAGE_URL =
  "https://cdn.discordapp.com/attachments/1443746157082706054/1447963237919227934/Unknown.gif";

function buildCalendarEmbed(date) {
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

///////////////////////////////////////////////////////////////
// DAILY SEND
///////////////////////////////////////////////////////////////
let lastSent = null;

async function sendDaily(reason) {
  try {
    const ch = await client.channels.fetch(config.channelId);
    const now = getThaiDate();
    const today = keyDate(now);

    if (lastSent === today) return;
    lastSent = today;

    await ch.send({ content: "@everyone", embeds: [buildCalendarEmbed(now)] });
    console.log("ส่งปฏิทินแล้ว:", today, reason);
  } catch (e) {
    console.error("ส่งปฏิทินผิดพลาด:", e);
  }
}

///////////////////////////////////////////////////////////////
// ⚡ RANK PANEL CONFIG
///////////////////////////////////////////////////////////////
const PANEL_IMAGE =
  "https://cdn.discordapp.com/attachments/1445301442092072980/1448043469015613470/IMG_4817.gif";
const WELCOME_IMAGE =
  "https://cdn.discordapp.com/attachments/1445301442092072980/1448043511558570258/1be0c476c8a40fbe206e2fbc6c5d213c.jpg";

///////////////////////////////////////////////////////////////
// ⚡ BOT STATUS PANEL IMAGES
///////////////////////////////////////////////////////////////
const STATUS_PANEL_IMAGE =
  "https://cdn.discordapp.com/attachments/1443746157082706054/1448123647524081835/Unknown.gif";
const STATUS_PANEL_ICON =
  "https://cdn.discordapp.com/attachments/1443746157082706054/1448123939250507887/CFA9E582-8035-4C58-9A79-E1269A5FB025.png";

///////////////////////////////////////////////////////////////
// ⚡ MUSIC PANEL IMAGES
///////////////////////////////////////////////////////////////
const MUSIC_BAR_IMAGE =
  "https://cdn.discordapp.com/attachments/1443746157082706054/1448167924375486485/IMG_8326-1.gif";
const MUSIC_ICON_IMAGE =
  "https://cdn.discordapp.com/attachments/1443746157082706054/1448169010159157268/Unknown.gif";
const MUSIC_FALLBACK_THUMB =
  "https://i.ytimg.com/vi/5qap5aO4i9A/maxresdefault.jpg";

///////////////////////////////////////////////////////////////
// SLASH COMMAND REGISTER
///////////////////////////////////////////////////////////////
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
      ),
    new SlashCommandBuilder()
      .setName("setupmusic")
      .setDescription("สร้าง Music Panel สำหรับควบคุมเพลง (เฉพาะแอดมิน)")
  ].map((c) => c.toJSON());

  const rest = new REST({ version: "10" }).setToken(config.token);
  await rest.put(Routes.applicationCommands(client.user.id), {
    body: commands
  });
  console.log("REGISTERED /rankpanel + /botpanel + /setupmusic");
}

///////////////////////////////////////////////////////////////
// BOT STATUS PANEL DATA
///////////////////////////////////////////////////////////////
const botPanels = new Map(); // guildId -> { channelId, messageId, botIds, maintenance:Set }

function buildBotPanelEmbed(guild, panelData) {
  const blocks = [];
  let index = 1;

  for (const botId of panelData.botIds) {
    const member = guild.members.cache.get(botId);
    const mention = `<@${botId}>`;

    const presence = member?.presence;
    const isOnline =
      presence && presence.status && presence.status !== "offline";

    const inMaintenance = panelData.maintenance.has(botId);

    let statusLine;
    let modeLine;

    if (inMaintenance) {
      statusLine = "🛰 สถานะ : ออฟไลน์ 🔴";
      modeLine = "⚙ โหมด : กำลังปรับปรุงอยู่ 🛠️";
    } else if (isOnline) {
      statusLine = "🛰 สถานะ : ออนไลน์อยู่ 🟢";
      modeLine = "⚙ โหมด : ปกติ";
    } else {
      statusLine = "🛰 สถานะ : ออฟไลน์อยู่ 🔴";
      modeLine = "⚙ โหมด : ปกติ";
    }

    blocks.push(`**${index}. ${mention}**\n${statusLine}\n${modeLine}`);
    index++;
  }

  const desc =
    `🛰️ สถานะบอทในเซิร์ฟเวอร์ **${guild.name}**\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    blocks.join("\n\n") +
    `\n\n> ใช้ปุ่มด้านล่างสำหรับแอดมินในการสลับสถานะ “กำลังปรับปรุงอยู่ 🛠️” ของแต่ละบอทนะค้าบ 💗`;

  return new EmbedBuilder()
    .setColor(0x00ffc8)
    .setTitle("🌸 xSwift Hub | Bot Status Panel")
    .setDescription(desc)
    .setImage(STATUS_PANEL_IMAGE)
    .setThumbnail(STATUS_PANEL_ICON)
    .setFooter({
      text: "อัปเดตสถานะอัตโนมัติแบบเรียลไทม์ • By Zemon Źx"
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

///////////////////////////////////////////////////////////////
// MUSIC SYSTEM – QUEUE / PLAYER
///////////////////////////////////////////////////////////////
const musicQueues = new Map(); // guildId -> { tracks, index, loop, volume, player }
const musicPanels = new Map(); // guildId -> { channelId, messageId }

function getQueue(guildId) {
  if (!musicQueues.has(guildId)) {
    musicQueues.set(guildId, {
      tracks: [],
      index: 0,
      loop: "off", // off | one | all
      volume: 100,
      player: null
    });
  }
  return musicQueues.get(guildId);
}

async function connectMusicVoice(member) {
  const vc = member.voice.channel;
  if (!vc || !vc.isVoiceBased()) {
    throw new Error("คุณต้องอยู่ในห้องเสียงก่อนน้า");
  }

  let connection = getVoiceConnection(vc.guild.id);
  if (!connection) {
    connection = joinVoiceChannel({
      channelId: vc.id,
      guildId: vc.guild.id,
      adapterCreator: vc.guild.voiceAdapterCreator,
      selfDeaf: true
    });
  }

  await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
  return connection;
}

async function createPlayer(guildId, connection) {
  const queue = getQueue(guildId);
  if (queue.player) return queue.player;

  const player = createAudioPlayer({
    behaviors: {
      noSubscriber: NoSubscriberBehavior.Pause
    }
  });

  player.on(AudioPlayerStatus.Idle, async () => {
    await handleTrackEnd(guildId);
  });

  player.on("error", (err) => {
    console.log("PLAYER ERROR:", err.message);
  });

  connection.subscribe(player);
  queue.player = player;
  return player;
}

async function handleTrackEnd(guildId) {
  const queue = getQueue(guildId);
  if (!queue.tracks.length) return;

  if (queue.loop === "one") {
    // เล่นเพลงเดิมอีกรอบ
  } else if (queue.loop === "all") {
    queue.index = (queue.index + 1) % queue.tracks.length;
  } else {
    queue.index += 1;
    if (queue.index >= queue.tracks.length) {
      queue.index = queue.tracks.length - 1;
      return updateMusicPanel(guildId);
    }
  }

  await playCurrentTrack(guildId);
}

async function playCurrentTrack(guildId) {
  const queue = getQueue(guildId);
  const track = queue.tracks[queue.index];
  if (!track) return;

  const connection = getVoiceConnection(guildId);
  if (!connection) return;

  const stream = await play.stream(track.url);
  const resource = createAudioResource(stream.stream, {
    inputType: stream.type,
    inlineVolume: true
  });
  resource.volume.setVolume(queue.volume / 100);

  const player = queue.player;
  player.play(resource);

  await updateMusicPanel(guildId);
}

async function addTrack(guild, user, url) {
  if (!play.yt_validate(url)) {
    throw new Error("ลิงก์นี้ไม่ใช่ YouTube URL ที่ถูกต้องน้า");
  }

  const info = await play.video_basic_info(url);
  const v = info.video_details;

  const track = {
    url,
    title: v.title,
    author: v.channel?.name || "ไม่ทราบผู้สร้าง",
    duration: v.durationInSec || 0,
    thumbnail: v.thumbnails?.[0]?.url || MUSIC_FALLBACK_THUMB,
    requestedBy: user.id
  };

  const queue = getQueue(guild.id);
  queue.tracks.push(track);

  if (queue.tracks.length === 1) {
    queue.index = 0;
  }

  return track;
}

function formatDuration(sec) {
  if (!sec || isNaN(sec)) return "ไม่ทราบเวลา";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m} นาที ${s.toString().padStart(2, "0")} วิ`;
}

function buildMusicEmbeds(guild) {
  const q = getQueue(guild.id);
  const tracks = q.tracks;
  const current = tracks[q.index];

  const queueEmbed = new EmbedBuilder()
    .setColor(0x00ffb3)
    .setTitle("Mitthu | Music Panel")
    .setThumbnail(MUSIC_ICON_IMAGE);

  if (!tracks.length) {
    queueEmbed.setDescription(
      "คิวเพลงว่างอยู่เลย ลองกดปุ่มด้านล่างเพื่อใส่ลิงก์เพลงจาก YouTube น้า 🎵"
    );
  } else {
    const lines = tracks.map((t, idx) => {
      const num = (idx + 1).toString().padStart(2, "0");
      const dur = t.duration ? Math.round(t.duration / 60) + "m" : "?m";
      const prefix = idx === q.index ? "**[กำลังเล่น]**" : `[${num}]`;
      return `${prefix} ${t.title} • ${dur}`;
    });
    queueEmbed.setDescription(
      `• คิวเพลงตอนนี้: **${tracks.length}** เพลง\n` + lines.join("\n")
    );
  }

  queueEmbed.setImage(MUSIC_BAR_IMAGE);

  const nowEmbed = new EmbedBuilder().setColor(0x0099ff).setTitle("Currently Playing");

  if (!current) {
    nowEmbed.setDescription("ยังไม่มีเพลงกำลังเล่นอยู่ 🎧");
    nowEmbed.setImage(MUSIC_FALLBACK_THUMB);
  } else {
    nowEmbed.setDescription(
      `**ชื่อเพลง:** ${current.title}\n` +
        `**เจ้าของช่อง:** ${current.author}\n` +
        `**ความยาว:** ${formatDuration(current.duration)}\n` +
        `**ขอโดย:** <@${current.requestedBy}>`
    );
    nowEmbed.setImage(current.thumbnail || MUSIC_FALLBACK_THUMB);
  }

  const loopText =
    q.loop === "one"
      ? "ลูปเพลงเดียว 🔂"
      : q.loop === "all"
      ? "ลูปทั้งคิว 🔁"
      : "ปิดลูป";

  const player = q.player;
  const paused = player ? player.state.status === AudioPlayerStatus.Paused : false;

  nowEmbed.setFooter({
    text: `Paused: ${paused ? "Yes" : "No"} • Loop: ${loopText} • Volume: ${
      q.volume
    }%`
  });

  return [queueEmbed, nowEmbed];
}

async function updateMusicPanel(guildId) {
  const panel = musicPanels.get(guildId);
  if (!panel) return;

  try {
    const guild = await client.guilds.fetch(guildId);
    const channel = await client.channels.fetch(panel.channelId);
    if (!channel || !channel.isTextBased()) return;

    const msg = await channel.messages.fetch(panel.messageId);
    const embeds = buildMusicEmbeds(guild);
    const rows = buildMusicButtons();

    await msg.edit({ embeds, components: rows });
  } catch (err) {
    console.log("อัปเดต Music Panel ล้มเหลว:", err.message);
  }
}

function buildMusicButtons() {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("music_add")
      .setLabel("🎵 ใส่ลิงก์เพลง")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("music_prev")
      .setEmoji("⏮️")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("music_playpause")
      .setEmoji("⏯️")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("music_next")
      .setEmoji("⏭️")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("music_stop")
      .setEmoji("⏹️")
      .setStyle(ButtonStyle.Danger)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("music_vol_down")
      .setEmoji("🔉")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("music_vol_up")
      .setEmoji("🔊")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("music_loop_off")
      .setLabel("⛔ ปิดลูป")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("music_loop_one")
      .setLabel("🔂 ลูปเพลง")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("music_loop_all")
      .setLabel("🔁 ลูปทั้งคิว")
      .setStyle(ButtonStyle.Secondary)
  );

  return [row1, row2];
}

///////////////////////////////////////////////////////////////
// INTERACTION HANDLER (Slash + Button + Select + Modal)
///////////////////////////////////////////////////////////////
client.on("interactionCreate", async (i) => {
  // Slash Commands
  if (i.isChatInputCommand()) {
    // ===== /rankpanel =====
    if (i.commandName === "rankpanel") {
      if (!i.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
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
      if (!i.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
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
        maintenance: new Set()
      };

      const embed = buildBotPanelEmbed(i.guild, panelData);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`botpanel_manage_${i.guild.id}`)
          .setStyle(ButtonStyle.Secondary)
          .setLabel("🛠️ ตั้งสถานะกำลังปรับปรุง")
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

    // ===== /setupmusic =====
    if (i.commandName === "setupmusic") {
      if (!i.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return i.reply({
          content: "❌ ต้องเป็นแอดมินนะค้าบ",
          ephemeral: true
        });
      }

      const guild = i.guild;
      const embeds = buildMusicEmbeds(guild);
      const rows = buildMusicButtons();

      const msg = await i.channel.send({ embeds, components: rows });

      musicPanels.set(guild.id, {
        channelId: i.channel.id,
        messageId: msg.id
      });

      return i.reply({
        content: "✅ สร้าง Music Panel เรียบร้อยค้าบ 🎶",
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
            const logChannel = await client.channels.fetch(config.welcomeLog);
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
            console.log("ส่งข้อความห้อง welcomeLog ไม่สำเร็จ:", err.message);
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

    // ===== ปุ่มจัดการ Bot Panel =====
    if (i.customId === `botpanel_manage_${i.guild.id}`) {
      if (!i.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
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

    // ===== ปุ่ม MUSIC PANEL =====
    if (i.customId.startsWith("music_")) {
      const guildId = i.guild.id;
      const queue = getQueue(guildId);

      try {
        if (i.customId === "music_add") {
          const modal = new ModalBuilder()
            .setCustomId("music_add_modal")
            .setTitle("เพิ่มเพลงจากลิงก์ YouTube");

          const input = new TextInputBuilder()
            .setCustomId("music_url")
            .setLabel("ใส่ลิงก์ YouTube ที่ต้องการเพิ่มลงคิว")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

          const row = new ActionRowBuilder().addComponents(input);
          modal.addComponents(row);

          return i.showModal(modal);
        }

        if (["music_prev", "music_next", "music_stop", "music_playpause"].includes(i.customId)) {
          if (!queue.tracks.length) {
            return i.reply({
              content: "ตอนนี้ยังไม่มีเพลงในคิวน้า 🎵",
              ephemeral: true
            });
          }

          if (i.customId === "music_prev") {
            queue.index = Math.max(0, queue.index - 1);
            await playCurrentTrack(guildId);
          } else if (i.customId === "music_next") {
            queue.index = Math.min(queue.tracks.length - 1, queue.index + 1);
            await playCurrentTrack(guildId);
          } else if (i.customId === "music_stop") {
            const conn = getVoiceConnection(guildId);
            if (conn) conn.destroy();
            queue.player?.stop();
          } else if (i.customId === "music_playpause") {
            const player = queue.player;
            if (!player) {
              const connection = await connectMusicVoice(i.member);
              await createPlayer(guildId, connection);
              await playCurrentTrack(guildId);
            } else if (player.state.status === AudioPlayerStatus.Playing) {
              player.pause();
            } else {
              player.unpause();
            }
          }

          await updateMusicPanel(guildId);
          return i.deferUpdate();
        }

        if (i.customId === "music_vol_down" || i.customId === "music_vol_up") {
          if (!queue.player) {
            return i.reply({
              content: "ยังไม่มีเพลงกำลังเล่นอยู่เลยน้า 🎧",
              ephemeral: true
            });
          }
          const delta = i.customId === "music_vol_down" ? -10 : 10;
          queue.volume = Math.max(0, Math.min(200, queue.volume + delta));
          if (queue.player.state.resource?.volume) {
            queue.player.state.resource.volume.setVolume(queue.volume / 100);
          }
          await updateMusicPanel(guildId);
          return i.reply({
            content: `🔊 ปรับเสียงเป็น **${queue.volume}%** แล้วค้าบ`,
            ephemeral: true
          });
        }

        if (i.customId === "music_loop_off") {
          queue.loop = "off";
        } else if (i.customId === "music_loop_one") {
          queue.loop = "one";
        } else if (i.customId === "music_loop_all") {
          queue.loop = "all";
        }

        if (i.customId.startsWith("music_loop_")) {
          await updateMusicPanel(guildId);
          return i.reply({
            content: `🔁 ตั้งค่าโหมดลูปเป็น **${queue.loop}** แล้วค้าบ`,
            ephemeral: true
          });
        }
      } catch (err) {
        console.log("MUSIC BUTTON ERROR:", err.message);
        return i.reply({
          content: "❌ มีอะไรผิดพลาดตอนใช้ Music Panel ลองใหม่อีกทีน้า",
          ephemeral: true
        });
      }
    }

    return;
  }

  // Select Menu
  if (i.isStringSelectMenu()) {
    if (i.customId === "botpanel_select") {
      if (!i.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
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
        content: "✅ อัปเดตสถานะบอทเรียบร้อยค้าบ",
        components: []
      });
    }
  }

  // Modal (เพิ่มเพลง)
  if (i.isModalSubmit()) {
    if (i.customId === "music_add_modal") {
      const url = i.fields.getTextInputValue("music_url");
      const guildId = i.guild.id;

      try {
        // ป้องกัน interaction หมดอายุก่อนเสร็จงาน
        await i.deferReply({ ephemeral: true });

        const connection = await connectMusicVoice(i.member);
        const queue = getQueue(guildId);
        await createPlayer(guildId, connection);
        const track = await addTrack(i.guild, i.user, url);

        if (queue.tracks.length === 1) {
          await playCurrentTrack(guildId);
        } else {
          await updateMusicPanel(guildId);
        }

        await i.editReply({
          content: `✅ เพิ่มเพลง **${track.title}** ลงคิวแล้วค้าบ 🎵`
        });
      } catch (err) {
        console.log("ADD MUSIC ERROR:", err);

        try {
          const msg = `❌ เพิ่มเพลงไม่สำเร็จ: ${err.message}`;
          if (i.deferred || i.replied) {
            await i.editReply({ content: msg });
          } else {
            await i.reply({ content: msg, ephemeral: true });
          }
        } catch (e) {
          console.log("FAILED TO SEND ERROR REPLY:", e.message);
        }
      }
    }
  }
});

///////////////////////////////////////////////////////////////
// Presence Update -> Refresh Bot Panel
///////////////////////////////////////////////////////////////
client.on("presenceUpdate", async (oldP, newP) => {
  const p = newP || oldP;
  if (!p?.user?.bot) return;
  const guildId = p.guild?.id;
  if (!guildId) return;
  if (!botPanels.has(guildId)) return;

  await updateBotPanel(guildId);
});

///////////////////////////////////////////////////////////////
// READY
///////////////////////////////////////////////////////////////
client.once("ready", async () => {
  console.log("ล็อกอินเป็น", client.user.tag, "แล้วจ้า 💗");

  await registerCommands();
  // ❌ ตัด connectVoice ออกแล้ว ไม่จอยห้องเสียงอัตโนมัติ
  await sendDaily("on-ready");

  cron.schedule("0 0 * * *", () => sendDaily("cron"), {
    timezone: config.timezone || "Asia/Bangkok"
  });
});

client.login(config.token);
