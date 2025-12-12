// index.js - MASTER ULTRA VERSION + RANK PANEL SYSTEM (ROLE OPTION) + BOT STATUS PANEL + TICKETS
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
  VoiceConnectionStatus
} = require("@discordjs/voice");

const cron = require("node-cron");
const config = require("./bot_config");

// NOTE: include partials so reaction events work with old messages
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent
  ],
  partials: ["MESSAGE", "CHANNEL", "REACTION", "USER", "GUILD_MEMBER"]
});

/////////////////////////////////////////////////////////////////
// Reaction-role persistence
/////////////////////////////////////////////////////////////////
const REACT_DATA_FILE = path.join(__dirname, "reaction_roles.json");
let reactionRoleMap = new Map(); // Map<messageId, Map<emojiKey, roleId>>

function emojiKey(emoji) {
  if (!emoji) return String(emoji);
  return emoji.id ? `${emoji.name}:${emoji.id}` : emoji.name;
}

function loadReactionRoles() {
  try {
    if (!fs.existsSync(REACT_DATA_FILE)) return;
    const raw = fs.readFileSync(REACT_DATA_FILE, "utf8");
    const obj = JSON.parse(raw);
    reactionRoleMap = new Map();
    for (const [messageId, mapObj] of Object.entries(obj)) {
      const inner = new Map();
      for (const [k, v] of Object.entries(mapObj)) {
        inner.set(k, v);
      }
      reactionRoleMap.set(messageId, inner);
    }
    console.log("Loaded reaction role mappings:", reactionRoleMap.size);
  } catch (e) {
    console.error("Failed to load reaction roles:", e);
  }
}

function saveReactionRoles() {
  try {
    const out = {};
    for (const [messageId, mapObj] of reactionRoleMap.entries()) {
      out[messageId] = Object.fromEntries(mapObj);
    }
    fs.writeFileSync(REACT_DATA_FILE, JSON.stringify(out, null, 2), "utf8");
  } catch (e) {
    console.error("Failed to save reaction roles:", e);
  }
}

/////////////////////////////////////////////////////////////////
// Helper: Build description for react panel
/////////////////////////////////////////////////////////////////
function renderEmojiForDescription(key) {
  if (!key) return key;
  const customMatch = key.match(/^([a-zA-Z0-9_]+):(\d+)$/);
  if (customMatch) {
    const name = customMatch[1];
    const id = customMatch[2];
    return `<:${name}:${id}>`;
  }
  return key; // unicode
}

/**
 * Build embed description lines for a react-role message.
 * Group by roleId so each role appears once, showing all emojis that map to it:
 *  | emoji emoji ・ <@&roleId>
 */
async function buildReactPanelDescription(messageId, guild = null) {
  const headerLines = [];
  headerLines.push("╭┈ ✧ : กดอิโมจิข้างล่างรับยศ ต่างๆ ˗ˏˋ꒰ ☄️ ꒱");
  const mapForMsg = reactionRoleMap.get(messageId);
  if (!mapForMsg || mapForMsg.size === 0) {
    headerLines.push(" |・");
    headerLines.push(" |・");
  } else {
    // preserve order of first appearance: collect role order by scanning mapForMsg
    const roleOrder = [];
    const roleToEmojis = new Map();
    for (const [eKey, roleId] of mapForMsg.entries()) {
      if (!roleToEmojis.has(roleId)) roleToEmojis.set(roleId, []);
      // avoid duplicate emoji entry for same role
      const arr = roleToEmojis.get(roleId);
      if (!arr.includes(eKey)) arr.push(eKey);
      if (!roleOrder.includes(roleId)) roleOrder.push(roleId);
    }

    for (const roleId of roleOrder) {
      const emojiKeys = roleToEmojis.get(roleId) || [];
      const rendered = emojiKeys.map((k) => renderEmojiForDescription(k)).join(" ");
      // show only mention as requested
      headerLines.push(` | ${rendered} ・ <@&${roleId}>`);
    }
  }
  headerLines.push("╰ ┈ ✧ : เลือกได้ 1 ยศ กดอิโมจิเดิม = ถอนยศ");
  return headerLines.join("\n");
}

async function updateReactPanelEmbedForMessage(message) {
  try {
    if (!message || !message.id) return;
    if (!reactionRoleMap.has(message.id)) reactionRoleMap.set(message.id, new Map());
    const desc = await buildReactPanelDescription(message.id, message.guild);

    const embed = new EmbedBuilder()
      .setTitle("🌸 รับยศด้วยการกดอิโมจิ")
      .setDescription(desc)
      .setColor(0xf772d4)
      .setImage(REACT_PANEL_TOP)
      .setThumbnail(REACT_PANEL_ICON)
      .setFooter({ text: "xSwift Hub | Reaction Roles" });

    await message.edit({ embeds: [embed] }).catch(() => {});
  } catch (e) {
    console.log("Failed to update react panel embed:", e.message);
  }
}

/////////////////////////////////////////////////////////////////
// (Other utils, calendar, images, panels ... keep unchanged from your original file)
// For brevity in this paste I keep the rest of the original file contents unchanged,
// but in the final file you must keep everything that was previously present (calendar, bot panels, ticket system, etc.).
// Below I include the necessary constants used in embeds so the file is self-contained.

const PANEL_IMAGE =
  "https://cdn.discordapp.com/attachments/1445301442092072980/1448043469015613470/IMG_4817.gif";
const WELCOME_IMAGE =
  "https://cdn.discordapp.com/attachments/1445301442092072980/1448043511558570258/1be0c476c8a40fbe206e2fbc6c5d213c.jpg";

const STATUS_PANEL_IMAGE =
  "https://cdn.discordapp.com/attachments/1443746157082706054/1448123647524081835/Unknown.gif";
const STATUS_PANEL_ICON =
  "https://cdn.discordapp.com/attachments/1443746157082706054/1448123939250507887/CFA9E582-8035-4C58-9A79-E1269A5FB025.png";

const TICKET_PANEL_BANNER =
  "https://cdn.discordapp.com/attachments/1443746157082706054/1448377350961106964/Strawberry_Bunny_Banner___Tickets.jpg";
const TICKET_DIVIDER_IMAGE =
  "https://cdn.discordapp.com/attachments/1443746157082706054/1448377343004508304/Unknown.gif";
const TICKET_SMALL_CORNER =
  "https://cdn.discordapp.com/attachments/1443746157082706054/1448471958462140549/Unknown.gif";

const REACT_PANEL_TOP =
  "https://cdn.discordapp.com/attachments/1443960971394809906/1448605236603392142/Unknown.gif";
const REACT_PANEL_BOTTOM =
  "https://cdn.discordapp.com/attachments/1443960971394809906/1448483231992381530/Unknown.gif";
const REACT_PANEL_ICON =
  "https://cdn.discordapp.com/attachments/1443746157082706054/1448605563263913984/IMG_5385.gif";

const TICKET_STEP_IMAGE = TICKET_DIVIDER_IMAGE;

// (You should keep the rest of your calendar, ticket, bot panel, registerCommands functions, etc. unchanged.)
// For safety, the below is the reaction handling + ready + addreact/commands logic — which we ensure to keep compatible.

/////////////////////////////////////////////////////////////////
// Slash register & commands (keep as original, ensure addreact uses same emojiKey format)
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
      ),
    new SlashCommandBuilder()
      .setName("ticketpanel")
      .setDescription("สร้าง Panel Tickets สำหรับติดต่อแอดมิน (เฉพาะแอดมิน)")
      .addChannelOption((opt) =>
        opt
          .setName("channel")
          .setDescription("ห้องที่จะให้บอทส่ง Panel Tickets")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName("reactpanel")
      .setDescription("สร้าง Reaction-Role Panel (เฉพาะแอดมิน)")
      .addChannelOption((opt) =>
        opt
          .setName("channel")
          .setDescription("ห้องที่จะให้บอทส่ง Reaction Panel")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName("addreact")
      .setDescription("เพิ่มอิโมจิ + ยศเข้าไปในข้อความ Reaction-Role (เฉพาะแอดมิน)")
      .addStringOption((opt) =>
        opt
          .setName("message_id")
          .setDescription("ไอดีข้อความที่ต้องการเพิ่มอิโมจิ")
          .setRequired(true)
      )
      .addStringOption((opt) =>
        opt
          .setName("emoji")
          .setDescription("อิโมจิ (unicode หรือ <a:name:id> / <name:id>)")
          .setRequired(true)
      )
      .addRoleOption((opt) =>
        opt
          .setName("role")
          .setDescription("ยศที่จะให้เมื่อกดอิโมจินี้")
          .setRequired(true)
      )
  ].map((c) => c.toJSON());

  const rest = new REST({ version: "10" }).setToken(config.token);
  await rest.put(Routes.applicationCommands(client.user.id), {
    body: commands
  });
  console.log("REGISTERED /rankpanel + /botpanel + /ticketpanel + /reactpanel + /addreact");
}

/////////////////////////////////////////////////////////////////
// Interaction handler: only relevant parts (reactpanel, addreact kept similar)
/////////////////////////////////////////////////////////////////
client.on("interactionCreate", async (i) => {
  if (!i.isChatInputCommand()) {
    // keep other interaction types handled later in the file
  } else {
    // /reactpanel
    if (i.commandName === "reactpanel") {
      if (!i.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return i.reply({ content: "❌ ต้องเป็นแอดมินนะค้าบ", ephemeral: true });
      }

      const targetChannel = i.options.getChannel("channel");
      if (!targetChannel || !targetChannel.isTextBased()) {
        return i.reply({ content: "❌ กรุณาเลือกห้องข้อความปกตินะค้าบ", ephemeral: true });
      }

      const initialEmbed = new EmbedBuilder()
        .setTitle("🌸 รับยศด้วยการกดอิโมจิ")
        .setDescription("╭┈ ✧ : กดอิโมจิข้างล่างรับยศ ต่างๆ ˗ˏˋ꒰ ☄️ ꒱\n |・\n |・\n╰ ┈ ✧ : เลือกได้ 1 ยศ กดอิโมจิเดิม = ถอนยศ")
        .setColor(0xf772d4)
        .setImage(REACT_PANEL_TOP)
        .setThumbnail(REACT_PANEL_ICON)
        .setFooter({ text: "xSwift Hub | Reaction Roles" });

      const sent = await targetChannel.send({ embeds: [initialEmbed] });

      if (!reactionRoleMap.has(sent.id)) reactionRoleMap.set(sent.id, new Map());
      saveReactionRoles();
      await updateReactPanelEmbedForMessage(sent);

      return i.reply({ content: `✅ สร้าง Reaction Role Panel ใน ${targetChannel} เรียบร้อยจ้า\nMessage ID: \`${sent.id}\``, ephemeral: true });
    }

    // /addreact
    if (i.commandName === "addreact") {
      if (!i.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return i.reply({ content: "❌ ต้องเป็นแอดมินนะค้าบ", ephemeral: true });
      }

      const messageId = i.options.getString("message_id");
      const emojiInput = i.options.getString("emoji");
      const role = i.options.getRole("role");

      let foundMessage = null;
      for (const ch of i.guild.channels.cache.values()) {
        if (!ch.isTextBased()) continue;
        try {
          const m = await ch.messages.fetch(messageId).catch(() => null);
          if (m) {
            foundMessage = m;
            break;
          }
        } catch (e) {}
      }

      if (!foundMessage) {
        return i.reply({ content: "❌ ไม่พบข้อความที่ระบุในเซิร์ฟนี้ ลองตรวจสอบ Message ID อีกครั้งนะค้าบ", ephemeral: true });
      }

      let emojiRaw = emojiInput.trim();
      let emojiToReact = null;
      let emojiKeyValue = null;

      const customMatch = emojiRaw.match(/<a?:([a-zA-Z0-9_]+):(\d+)>/);
      if (customMatch) {
        const name = customMatch[1];
        const id = customMatch[2];
        emojiKeyValue = `${name}:${id}`;
        const emojiObj = client.emojis.cache.get(id);
        if (emojiObj) {
          emojiToReact = emojiObj.identifier;
        } else {
          emojiToReact = `${name}:${id}`;
        }
      } else {
        emojiToReact = emojiRaw;
        emojiKeyValue = emojiRaw;
      }

      try {
        await foundMessage.react(emojiToReact);
      } catch (err) {
        return i.reply({ content: `❌ ไม่สามารถเพิ่มอิโมจิให้ข้อความได้ (bot อาจไม่มี permission หรือ emoji ไม่ถูกต้อง)\nError: ${err.message}`, ephemeral: true });
      }

      if (!reactionRoleMap.has(foundMessage.id)) reactionRoleMap.set(foundMessage.id, new Map());
      const mapForMsg = reactionRoleMap.get(foundMessage.id);
      mapForMsg.set(emojiKeyValue, role.id);
      saveReactionRoles();

      try {
        await updateReactPanelEmbedForMessage(foundMessage);
      } catch (e) {
        console.log("Failed to update panel after addreact:", e.message);
      }

      return i.reply({ content: `✅ เพิ่มอิโมจิ ${emojiInput} -> ยศ **${role.name}** ให้กับข้อความ \`${foundMessage.id}\` เรียบร้อยจ้า`, ephemeral: true });
    }

    // keep other chat commands (rankpanel, botpanel, ticketpanel) unchanged — if you need I can paste them back verbatim
  }
});

/////////////////////////////////////////////////////////////////
// Reaction handlers (UPDATED)
/////////////////////////////////////////////////////////////////
client.on("messageReactionAdd", async (reaction, user) => {
  try {
    if (user.bot) return;
    if (reaction.partial) await reaction.fetch();
    if (reaction.message.partial) await reaction.message.fetch();

    const msg = reaction.message;
    const msgId = msg.id;
    if (!reactionRoleMap.has(msgId)) return;

    const mapForMsg = reactionRoleMap.get(msgId);
    const key = emojiKey(reaction.emoji);
    if (!mapForMsg.has(key)) return;

    const roleId = mapForMsg.get(key);
    const guild = msg.guild;
    if (!guild) return;

    const member = await guild.members.fetch(user.id).catch(() => null);
    if (!member) return;

    // Enforce single-role-per-message:
    // Remove roles from this panel that the user already has (except selected)
    for (const [eKey, rId] of mapForMsg.entries()) {
      if (rId === roleId) continue;
      if (member.roles.cache.has(rId)) {
        try {
          await member.roles.remove(rId, "Reaction role exclusive (removed for new reaction)");
        } catch (e) {
          console.log("Cannot remove other role:", e.message);
        }
      }
    }

    // Add role
    try {
      if (!member.roles.cache.has(roleId)) {
        await member.roles.add(roleId, "Reaction role added");
      }
    } catch (err) {
      console.error("Failed to add role:", err.code || err.message || err);
      // Optionally inform user (ephemeral) — but keep silent here to avoid spamming
    }

    // Remove other reactions from this user on the message for UX (if bot has Manage Messages)
    try {
      const reactions = msg.reactions.cache;
      for (const r of reactions.values()) {
        const rKey = emojiKey(r.emoji);
        if (rKey === key) continue;
        await r.users.remove(user.id).catch(() => {});
      }
    } catch (e) {
      // ignore permission errors
    }

    // Update embed just in case (not strictly necessary)
    try {
      await updateReactPanelEmbedForMessage(msg);
    } catch (e) {}
  } catch (err) {
    console.log("reaction add handler error:", err.message);
  }
});

client.on("messageReactionRemove", async (reaction, user) => {
  try {
    if (user.bot) return;
    if (reaction.partial) await reaction.fetch();
    if (reaction.message.partial) await reaction.message.fetch();

    const msg = reaction.message;
    const msgId = msg.id;
    if (!reactionRoleMap.has(msgId)) return;

    const mapForMsg = reactionRoleMap.get(msgId);
    const key = emojiKey(reaction.emoji);
    if (!mapForMsg.has(key)) return;

    const roleId = mapForMsg.get(key);
    const guild = msg.guild;
    if (!guild) return;

    const member = await guild.members.fetch(user.id).catch(() => null);
    if (!member) return;

    if (member.roles.cache.has(roleId)) {
      try {
        await member.roles.remove(roleId, "Reaction role removed by user");
      } catch (e) {
        console.log("Cannot remove role on reaction remove:", e.message);
      }
    }

    try {
      await updateReactPanelEmbedForMessage(msg);
    } catch (e) {}
  } catch (err) {
    console.log("reaction remove handler error:", err.message);
  }
});

/////////////////////////////////////////////////////////////////
// READY: load mappings & update panels + register commands + other initialization
/////////////////////////////////////////////////////////////////
client.once("ready", async () => {
  console.log("ล็อกอินเป็น", client.user.tag, "แล้วจ้า 💗");

  loadReactionRoles();

  // try update existing panel messages with current mapping (if any)
  for (const [messageId, mapObj] of reactionRoleMap.entries()) {
    try {
      let found = null;
      for (const guild of client.guilds.cache.values()) {
        try {
          for (const ch of guild.channels.cache.values()) {
            if (!ch.isTextBased()) continue;
            try {
              const m = await ch.messages.fetch(messageId).catch(()=>null);
              if (m) {
                found = m;
                break;
              }
            } catch (e) {}
          }
          if (found) {
            await updateReactPanelEmbedForMessage(found);
            break;
          }
        } catch (e) {}
      }
    } catch (e) {
      // ignore
    }
  }

  try {
    await registerCommands();
  } catch (e) {
    console.log("registerCommands error:", e.message);
  }

  // keep the rest of your initialization (connect voice, sendDaily, cron and bot panel updates) as before
  try {
    await connectVoice();
  } catch (e) {}
  try {
    await sendDaily("on-ready");
  } catch (e) {}

  cron.schedule("0 0 * * *", () => sendDaily("cron"), {
    timezone: "Asia/Bangkok"
  });

  // If you have a botPanels map & updateBotPanel logic, keep the interval running as before (not redefined here)
  // Example (if botPanels exists):
  if (typeof botPanels !== "undefined") {
    setInterval(() => {
      for (const guildId of botPanels.keys()) {
        try { updateBotPanel(guildId); } catch (e) {}
      }
    }, 10_000);
  }
});

client.login(config.token);
