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
    GatewayIntentBits.GuildPresences
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
// VOICE
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
const botPanels = new Map(); // guildId -> { channelId, messageId, botIds, maintenance:Set }

// ✅ ปรับหน้าตาข้อความใน Panel ตรงนี้อย่างเดียว
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

    blocks.push(
      `**${index}. ${mention}**\n` +
      `${statusLine}\n` +
      `${modeLine}`
    );
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

    // ===== ปุ่มจัดการ Bot Panel =====
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
        content: "✅ อัปเดตสถานะบอทเรียบร้อยค้าบ",
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

  cron.schedule("0 0 * * *", () => sendDaily("cron"), {
    timezone: "Asia/Bangkok"
  });
});

client.login(config.token);
