const TERRITORIES_DEFAULT = [
  { id: "downtown",   name: "Downtown",       emoji: "🏦", controlledBy: null, income: 500, xpBonus: 50 },
  { id: "industrial", name: "Industrial Zone", emoji: "🏭", controlledBy: null, income: 400, xpBonus: 40 },
  { id: "harbor",     name: "Harbor",          emoji: "🌉", controlledBy: null, income: 600, xpBonus: 60 },
  { id: "forest",     name: "Forest",          emoji: "🌲", controlledBy: null, income: 300, xpBonus: 30 },
  { id: "airport",    name: "Airport",         emoji: "✈️", controlledBy: null, income: 700, xpBonus: 70 },
  { id: "metro",      name: "Metro",           emoji: "🚇", controlledBy: null, income: 450, xpBonus: 45 },
  { id: "eastside",   name: "East Side",       emoji: "🏘️", controlledBy: null, income: 350, xpBonus: 35 },
  { id: "desert",     name: "Desert",          emoji: "🏜️", controlledBy: null, income: 250, xpBonus: 25 },
];

const gangs = new Map();
const userGangMap = new Map();
const territories = new Map();
const welcomeConfigs = new Map();
let activeTerritoryWar = null;
let warInterval = null;

for (const t of TERRITORIES_DEFAULT) {
  territories.set(t.id, { ...t });
}

function getGang(gangId) { return gangs.get(gangId); }
function getAllGangs() { return Array.from(gangs.values()); }
function getGangByName(name) {
  const lower = name.toLowerCase();
  return Array.from(gangs.values()).find((g) => g.name.toLowerCase() === lower);
}
function getUserGang(userId) {
  const gangId = userGangMap.get(userId);
  return gangId ? gangs.get(gangId) : undefined;
}
function createGang(gang) {
  gangs.set(gang.id, gang);
  for (const m of gang.members) userGangMap.set(m.userId, gang.id);
}
function updateGang(gang) {
  gangs.set(gang.id, gang);
  const memberIds = new Set(gang.members.map((m) => m.userId));
  for (const [uid, gid] of userGangMap.entries()) {
    if (gid === gang.id && !memberIds.has(uid)) userGangMap.delete(uid);
  }
  for (const m of gang.members) userGangMap.set(m.userId, gang.id);
}
function deleteGang(gangId) {
  const gang = gangs.get(gangId);
  if (gang) for (const m of gang.members) userGangMap.delete(m.userId);
  gangs.delete(gangId);
}
function getTerritory(id) { return territories.get(id); }
function getAllTerritories() { return Array.from(territories.values()); }
function updateTerritory(t) { territories.set(t.id, t); }
function getActiveTerritoryWar() { return activeTerritoryWar; }
function setActiveTerritoryWar(war) { activeTerritoryWar = war; }
function getWarInterval() { return warInterval; }
function setWarInterval(iv) { warInterval = iv; }

function getWelcomeConfig(guildId) {
  if (!welcomeConfigs.has(guildId)) {
    welcomeConfigs.set(guildId, {
      guildId,
      enabled: false,
      channelId: null,
      message: "Welcome {user} to {server}!",
      embedColor: "#5865F2",
      embedTitle: "Welcome to {server}!",
      embedDescription: "Hey {user}, glad you joined us!\nYou are member #{count}.",
      embedFooter: "Enjoy your stay!",
      embedAuthor: "",
      embedThumbnail: true,
      embedTimestamp: true,
      welcomeImageUrl: null,
      backgroundUrl: null,
      autoroleId: null,
      dmWelcome: false,
      antiBot: true,
      language: "en",
      buttons: [],
    });
  }
  return welcomeConfigs.get(guildId);
}
function updateWelcomeConfig(config) { welcomeConfigs.set(config.guildId, config); }
function resetWelcomeConfig(guildId) { welcomeConfigs.delete(guildId); }

const UPGRADE_COSTS = {
  hq:            [5000, 15000, 40000, 100000],
  armory:        [3000,  8000, 20000,  50000],
  warehouse:     [2000,  6000, 15000,  35000],
  security:      [4000, 10000, 25000,  60000],
  medicalCenter: [3500,  9000, 22000,  55000],
};

const UPGRADE_BENEFITS = {
  hq:            ["Max members +5", "Max members +10", "Max members +20", "Max members +40"],
  armory:        ["Attack +10%", "Attack +25%", "Attack +50%", "Attack +100%"],
  warehouse:     ["Bank cap +50k", "Bank cap +150k", "Bank cap +500k", "Bank cap unlimited"],
  security:      ["Defense +10%", "Defense +25%", "Defense +50%", "Defense +100%"],
  medicalCenter: ["Respawn -30s", "XP loss -25%", "Respawn instant", "Never lose XP"],
};

const RANK_EMOJIS = { leader: "👑", "co-leader": "⭐", captain: "🛡️", member: "👤", recruit: "🆕" };
const RANK_ORDER  = { leader: 5, "co-leader": 4, captain: 3, member: 2, recruit: 1 };

module.exports = {
  getGang, getAllGangs, getGangByName, getUserGang,
  createGang, updateGang, deleteGang,
  getTerritory, getAllTerritories, updateTerritory,
  getActiveTerritoryWar, setActiveTerritoryWar,
  getWarInterval, setWarInterval,
  getWelcomeConfig, updateWelcomeConfig, resetWelcomeConfig,
  UPGRADE_COSTS, UPGRADE_BENEFITS, RANK_EMOJIS, RANK_ORDER,
};
