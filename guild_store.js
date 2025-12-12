// guild_store.js
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'guild_config.json');

let store = {};
try {
  if (fs.existsSync(FILE)) {
    const raw = fs.readFileSync(FILE, 'utf8');
    store = raw ? JSON.parse(raw) : {};
  } else {
    store = {};
  }
} catch (e) {
  console.error('[guild_store] failed to load store, starting fresh:', e.message);
  store = {};
}

function save() {
  try {
    fs.writeFileSync(FILE, JSON.stringify(store, null, 2), 'utf8');
  } catch (e) {
    console.error('[guild_store] save error:', e.message);
  }
}

function getGuildConfig(guildId) {
  if (!guildId) return null;
  return store[guildId] || null;
}

function ensureGuildConfig(guildId) {
  if (!store[guildId]) store[guildId] = {};
  return store[guildId];
}

// notifyChannel = calendar channel
function setNotifyChannel(guildId, channelId) {
  const g = ensureGuildConfig(guildId);
  g.notifyChannel = channelId;
  save();
}

function getNotifyChannel(guildId) {
  const g = getGuildConfig(guildId);
  return g ? g.notifyChannel : null;
}

// Panel persistence (minimal serializable)
function setPanelData(guildId, panelData) {
  const g = ensureGuildConfig(guildId);

  // convert Sets/Maps to serializable arrays/objects
  const maintenanceArr = Array.from(panelData.maintenance || []);
  const stoppedArr = Array.from(panelData.stopped || []);
  // timeState -> array of [botId, { lastStatus, lastChangeAt }]
  let timeStateArr = [];
  if (panelData.timeState) {
    if (panelData.timeState instanceof Map) {
      timeStateArr = Array.from(panelData.timeState.entries()).map(([k, v]) => [k, v]);
    } else if (Array.isArray(panelData.timeState)) {
      timeStateArr = panelData.timeState;
    } else if (typeof panelData.timeState === 'object') {
      // object keyed by botId
      timeStateArr = Object.keys(panelData.timeState).map(k => [k, panelData.timeState[k]]);
    }
  }

  g.panel = {
    channelId: panelData.channelId,
    messageId: panelData.messageId,
    botIds: panelData.botIds || [],
    maintenance: maintenanceArr,
    stopped: stoppedArr,
    timeState: timeStateArr
  };
  save();
}

function getPanelData(guildId) {
  const g = getGuildConfig(guildId);
  if (!g || !g.panel) return null;
  const p = g.panel;
  const panel = {
    channelId: p.channelId,
    messageId: p.messageId,
    botIds: p.botIds || [],
    maintenance: new Set(p.maintenance || []),
    stopped: new Set(p.stopped || []),
    timeState: new Map((p.timeState || []).map(([k, v]) => [k, v]))
  };
  return panel;
}

function clearPanelData(guildId) {
  const g = getGuildConfig(guildId);
  if (!g) return;
  delete g.panel;
  save();
}

// welcome channel (per-guild)
function setWelcomeChannel(guildId, channelId) {
  const g = ensureGuildConfig(guildId);
  g.welcomeChannel = channelId;
  save();
}
function getWelcomeChannel(guildId) {
  const g = getGuildConfig(guildId);
  return g ? g.welcomeChannel : null;
}

// welcome log channel (per-guild)
function setWelcomeLogChannel(guildId, channelId) {
  const g = ensureGuildConfig(guildId);
  g.welcomeLog = channelId;
  save();
}
function getWelcomeLogChannel(guildId) {
  const g = getGuildConfig(guildId);
  return g ? g.welcomeLog : null;
}

// NEW: info channel (for /setinfo -> notifications after rank-accept button)
// This is the channel that will receive the "รับยศ" info embed (only)
function setInfoChannel(guildId, channelId) {
  const g = ensureGuildConfig(guildId);
  g.infoChannel = channelId;
  save();
}
function getInfoChannel(guildId) {
  const g = getGuildConfig(guildId);
  return g ? g.infoChannel : null;
}

// voice channel per-guild
function setVoiceChannel(guildId, channelId) {
  const g = ensureGuildConfig(guildId);
  g.voiceChannel = channelId || null;
  save();
}
function getVoiceChannel(guildId) {
  const g = getGuildConfig(guildId);
  return g ? g.voiceChannel : null;
}

// Generic custom storage helpers (backwards-compatible / flexible)
function setCustom(guildId, obj) {
  const g = ensureGuildConfig(guildId);
  g.custom = Object.assign({}, g.custom || {}, obj || {});
  save();
}
function getCustom(guildId) {
  const g = getGuildConfig(guildId);
  return g ? (g.custom || {}) : {};
}

// utility to load all panels (used on startup)
function loadAllPanels() {
  const out = {};
  for (const gid of Object.keys(store)) {
    if (store[gid].panel) {
      const p = store[gid].panel;
      out[gid] = {
        channelId: p.channelId,
        messageId: p.messageId,
        botIds: p.botIds || [],
        maintenance: new Set(p.maintenance || []),
        stopped: new Set(p.stopped || []),
        timeState: new Map((p.timeState || []).map(([k, v]) => [k, v]))
      };
    }
  }
  return out;
}

module.exports = {
  getGuildConfig,
  ensureGuildConfig,
  setNotifyChannel,
  getNotifyChannel,
  setPanelData,
  getPanelData,
  clearPanelData,
  setWelcomeChannel,
  getWelcomeChannel,
  setWelcomeLogChannel,
  getWelcomeLogChannel,
  setInfoChannel,
  getInfoChannel,
  setVoiceChannel,
  getVoiceChannel,
  setCustom,
  getCustom,
  loadAllPanels
};
