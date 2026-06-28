import { EmbedBuilder } from "discord.js";
import { v4 as uuidv4 } from "uuid";
import {
  getUserGang, getGangByName, getAllGangs, getAllTerritories, getTerritory,
  createGang, updateGang, deleteGang, updateTerritory,
  getActiveTerritoryWar, setActiveTerritoryWar, getWarInterval, setWarInterval,
  UPGRADE_COSTS, UPGRADE_BENEFITS, RANK_EMOJIS, RANK_ORDER,
} from "../data/store.js";
import { buildWelcomePanel } from "./welcomeHandler.js";
import { handleMissionCommand } from "./missionHandler.js";
import { handleHelpCommand } from "./helpHandler.js";

const PREFIX = "?";

function hasAdmin(msg) { return !!msg.member?.permissions.has("Administrator"); }

export async function handleMessage(msg) {
  if (msg.author.bot) return;
  if (!msg.content.startsWith(PREFIX)) return;

  const args    = msg.content.slice(PREFIX.length).trim().split(/\s+/);
  const command = args.shift()?.toLowerCase();
  if (!command) return;

  try {
    if (command === "help")      return handleHelpCommand(msg, args);
    if (command === "territory") return handleTerritory(msg);
    if (command === "attack")    return handleAttack(msg, args);
    if (command === "defend")    return handleDefend(msg, args);
    if (command === "leaderboard") return handleLeaderboard(msg, args);

    if (command === "welcome") {
      if (!hasAdmin(msg)) return msg.reply("❌ You need **Administrator** permission.");
      return msg.channel.send(buildWelcomePanel());
    }
    if (command === "startwar") {
      if (!hasAdmin(msg)) return msg.reply("❌ Administrator permission required.");
      return startWar(msg);
    }
    if (command === "stopwar") {
      if (!hasAdmin(msg)) return msg.reply("❌ Administrator permission required.");
      return stopWar(msg);
    }
    if (command === "gang") {
      const sub = args[0]?.toLowerCase();
      if (!sub) return msg.reply("Usage: `?gang <create|join|leave|info|members|bank|upgrade|promote|demote|mission>`");
      return handleGang(msg, sub, args.slice(1));
    }
  } catch (err) {
    console.error("Command error:", err);
    await msg.reply("❌ An error occurred. Please try again.");
  }
}

async function handleGang(msg, sub, args) {
  const userId = msg.author.id;

  if (sub === "create") {
    if (getUserGang(userId)) return msg.reply("❌ Already in a gang. Leave first with `?gang leave`.");
    const name = args.join(" ");
    if (!name) return msg.reply("Usage: `?gang create <name>`");
    if (name.length > 32) return msg.reply("❌ Name must be 32 characters or less.");
    if (getGangByName(name)) return msg.reply(`❌ A gang named **${name}** already exists.`);
    const emojis = ["🔴","🔵","🟢","🟡","🟣","🟠","⚫","⚪"];
    const emoji  = emojis[Math.floor(Math.random() * emojis.length)];
    const gang   = {
      id: uuidv4().slice(0,8), name, emoji, leaderId: userId,
      members: [{ userId, rank: "leader", joinedAt: Date.now(), xp: 0, kills: 0, defends: 0 }],
      bank: 0, territories: [], xp: 0, level: 1,
      upgrades: { hq: 0, armory: 0, warehouse: 0, security: 0, medicalCenter: 0 },
      createdAt: Date.now(),
    };
    createGang(gang);
    return msg.reply({ embeds: [
      new EmbedBuilder().setTitle(`${emoji} Gang Created!`)
        .setDescription(`**${name}** created! You are 👑 Leader.`).setColor(0x57f287)
        .addFields({ name: "Members", value: "1", inline: true }, { name: "Bank", value: "0 coins", inline: true })
        .setFooter({ text: `Gang ID: ${gang.id}` })
    ]});
  }

  if (sub === "join") {
    if (getUserGang(userId)) return msg.reply("❌ Already in a gang.");
    const name = args.join(" ");
    if (!name) return msg.reply("Usage: `?gang join <name>`");
    const gang = getGangByName(name);
    if (!gang) return msg.reply(`❌ No gang named **${name}** found.`);
    const max = 10 + gang.upgrades.hq * 5;
    if (gang.members.length >= max) return msg.reply("❌ This gang is full.");
    gang.members.push({ userId, rank: "recruit", joinedAt: Date.now(), xp: 0, kills: 0, defends: 0 });
    updateGang(gang);
    return msg.reply(`✅ You joined **${gang.emoji} ${gang.name}** as 🆕 Recruit!`);
  }

  if (sub === "leave") {
    const gang = getUserGang(userId);
    if (!gang) return msg.reply("❌ Not in a gang.");
    if (gang.leaderId === userId) return msg.reply("❌ Leaders cannot leave. Use `?gang disband`.");
    gang.members = gang.members.filter((m) => m.userId !== userId);
    updateGang(gang);
    return msg.reply(`✅ You left **${gang.emoji} ${gang.name}**.`);
  }

  if (sub === "disband") {
    const gang = getUserGang(userId);
    if (!gang) return msg.reply("❌ Not in a gang.");
    if (gang.leaderId !== userId) return msg.reply("❌ Only the leader can disband.");
    deleteGang(gang.id);
    return msg.reply(`💥 **${gang.emoji} ${gang.name}** disbanded.`);
  }

  if (sub === "info") {
    const name = args.join(" ");
    const gang = name ? getGangByName(name) : getUserGang(userId);
    if (!gang) return msg.reply(name ? `❌ No gang named **${name}**.` : "❌ Not in a gang.");
    const terrs   = getAllTerritories().filter((t) => t.controlledBy === gang.id);
    const leader  = gang.members.find((m) => m.rank === "leader");
    return msg.reply({ embeds: [
      new EmbedBuilder().setTitle(`${gang.emoji} ${gang.name}`).setColor(0x5865f2)
        .addFields(
          { name: "👑 Leader",     value: `<@${leader?.userId || gang.leaderId}>`, inline: true },
          { name: "👥 Members",    value: String(gang.members.length), inline: true },
          { name: "⭐ Level",      value: String(gang.level), inline: true },
          { name: "💰 Bank",       value: `${gang.bank.toLocaleString()} coins`, inline: true },
          { name: "🗺️ Territories",value: terrs.length ? terrs.map((t) => `${t.emoji} ${t.name}`).join(", ") : "None" },
          { name: "🔧 Upgrades",   value: `HQ:${gang.upgrades.hq} Armory:${gang.upgrades.armory} Security:${gang.upgrades.security}` },
        ).setFooter({ text: `ID: ${gang.id}` })
    ]});
  }

  if (sub === "members") {
    const name = args.join(" ");
    const gang = name ? getGangByName(name) : getUserGang(userId);
    if (!gang) return msg.reply(name ? `❌ No gang named **${name}**.` : "❌ Not in a gang.");
    const sorted = [...gang.members].sort((a, b) => RANK_ORDER[b.rank] - RANK_ORDER[a.rank]);
    const list   = sorted.map((m) => `${RANK_EMOJIS[m.rank]} <@${m.userId}> — XP: ${m.xp} | Kills: ${m.kills}`).join("\n");
    return msg.reply({ embeds: [
      new EmbedBuilder().setTitle(`${gang.emoji} ${gang.name} — Members (${gang.members.length})`)
        .setDescription(list || "No members").setColor(0x5865f2)
    ]});
  }

  if (sub === "bank") {
    const gang = getUserGang(userId);
    if (!gang) return msg.reply("❌ Not in a gang.");
    const income = getAllTerritories().filter((t) => t.controlledBy === gang.id).reduce((s, t) => s + t.income, 0);
    return msg.reply({ embeds: [
      new EmbedBuilder().setTitle(`${gang.emoji} ${gang.name} — Bank`).setColor(0xfee75c)
        .setDescription(`💰 Balance: **${gang.bank.toLocaleString()} coins**`)
        .addFields({ name: "📈 Income", value: `${income} coins/tick`, inline: true })
    ]});
  }

  if (sub === "upgrade") {
    const gang = getUserGang(userId);
    if (!gang) return msg.reply("❌ Not in a gang.");
    if (gang.leaderId !== userId) return msg.reply("❌ Only the leader can upgrade.");
    const keyMap = { hq:"hq", armory:"armory", warehouse:"warehouse", security:"security", medicalcenter:"medicalCenter" };
    const type   = args[0]?.toLowerCase();
    if (!type || !keyMap[type]) {
      const lines = Object.entries(UPGRADE_COSTS).map(([k, costs]) => {
        const lv = gang.upgrades[k]; return `**${k}** (Lv${lv}/4) — Next: ${costs[lv] ?? "MAX"} coins`;
      });
      return msg.reply({ embeds: [
        new EmbedBuilder().setTitle(`${gang.emoji} Gang Upgrades`).setDescription(lines.join("\n")).setColor(0x5865f2)
          .setFooter({ text: "Usage: ?gang upgrade <hq|armory|warehouse|security|medicalcenter>" })
      ]});
    }
    const key  = keyMap[type];
    const lv   = gang.upgrades[key];
    const costs = UPGRADE_COSTS[key];
    if (lv >= 4) return msg.reply("❌ Already at max level.");
    const cost = costs[lv];
    if (gang.bank < cost) return msg.reply(`❌ Need **${cost}** coins. You have **${gang.bank}**.`);
    gang.bank -= cost;
    gang.upgrades[key] = lv + 1;
    gang.level = Math.ceil(Object.values(gang.upgrades).reduce((a, b) => a + b, 0) / 5) + 1;
    updateGang(gang);
    const benefit = UPGRADE_BENEFITS[key]?.[lv] || "Improved";
    return msg.reply(`✅ **${key}** upgraded to Lv${lv+1}! Benefit: **${benefit}**`);
  }

  if (sub === "promote" || sub === "demote") {
    const gang = getUserGang(userId);
    if (!gang) return msg.reply("❌ Not in a gang.");
    if (gang.leaderId !== userId) return msg.reply("❌ Only the leader can promote/demote.");
    const mentionId = msg.mentions.users.first()?.id;
    if (!mentionId) return msg.reply(`Usage: \`?gang ${sub} @user\``);
    const member = gang.members.find((m) => m.userId === mentionId);
    if (!member) return msg.reply("❌ That user is not in your gang.");
    const ranks = ["recruit","member","captain","co-leader"];
    const idx   = ranks.indexOf(member.rank);
    if (sub === "promote") {
      if (idx >= ranks.length - 1) return msg.reply("❌ Already at max promotable rank.");
      member.rank = ranks[idx + 1];
    } else {
      if (idx <= 0) return msg.reply("❌ Already at lowest rank.");
      member.rank = ranks[idx - 1];
    }
    updateGang(gang);
    return msg.reply(`✅ <@${mentionId}> is now **${RANK_EMOJIS[member.rank]} ${member.rank}**.`);
  }

  if (sub === "mission") return handleMissionCommand(msg, args);

  return msg.reply("Unknown subcommand. Use: `?gang <create|join|leave|info|members|bank|upgrade|promote|demote|mission>`");
}

async function handleTerritory(msg) {
  const gangs = getAllGangs();
  const lines = getAllTerritories().map((t) => {
    const ctrl = t.controlledBy ? gangs.find((g) => g.id === t.controlledBy) : null;
    return `${t.emoji} **${t.name}** — ${ctrl ? `${ctrl.emoji} ${ctrl.name}` : "Unclaimed"} | 💰 ${t.income}/tick`;
  });
  return msg.reply({ embeds: [
    new EmbedBuilder().setTitle("🗺️ Territory Map").setDescription(lines.join("\n")).setColor(0x5865f2)
      .setFooter({ text: "Use ?attack <territory> to start a war" })
  ]});
}

async function handleAttack(msg, args) {
  const userId = msg.author.id;
  const gang   = getUserGang(userId);
  if (!gang) return msg.reply("❌ You must be in a gang to attack.");

  const name = args.join(" ").toLowerCase();
  if (!name) return msg.reply("Usage: `?attack <territory name>`");

  const territory = getAllTerritories().find((t) => t.name.toLowerCase().includes(name) || t.id === name);
  if (!territory) return msg.reply(`❌ Territory **${args.join(" ")}** not found. Use \`?territory\`.`);
  if (territory.controlledBy === gang.id) return msg.reply("❌ You already control this territory!");

  const activeWar = getActiveTerritoryWar();
  if (activeWar) {
    if (activeWar.territoryId !== territory.id) {
      const other = getAllTerritories().find((t) => t.id === activeWar.territoryId);
      return msg.reply(`❌ Active war at **${other?.name}**. Wait for it to finish.`);
    }
    const pts = Math.floor(Math.random() * 50) + 20 + gang.upgrades.armory * 10;
    activeWar.attackers[gang.id] = (activeWar.attackers[gang.id] || 0) + pts;
    setActiveTerritoryWar(activeWar);
    const m = gang.members.find((m) => m.userId === userId);
    if (m) { m.kills++; updateGang(gang); }
    return msg.reply(`⚔️ Attacked **${territory.emoji} ${territory.name}**! +${pts} pts for **${gang.emoji} ${gang.name}**!`);
  }

  const war = { territoryId: territory.id, startTime: Date.now(), endTime: Date.now() + 15*60000, attackers: { [gang.id]: Math.floor(Math.random()*50)+20 }, active: true, channelId: msg.channel.id };
  setActiveTerritoryWar(war);

  await msg.channel.send({ embeds: [
    new EmbedBuilder().setTitle("⚠️ Territory War Started!")
      .setDescription(`**Location:** ${territory.emoji} ${territory.name}\n**Time:** 15 Minutes\n\nJoin: \`?attack ${territory.name.toLowerCase()}\`\nDefend: \`?defend ${territory.name.toLowerCase()}\``)
      .setColor(0xed4245).setFooter({ text: "Most points wins!" })
  ]});

  const iv = setInterval(async () => {
    const w = getActiveTerritoryWar();
    if (!w || !w.active) { clearInterval(iv); return; }
    if (Date.now() >= w.endTime) { clearInterval(iv); await endWar(msg.channel); }
  }, 10000);
  setWarInterval(iv);
}

async function handleDefend(msg, args) {
  const userId = msg.author.id;
  const gang   = getUserGang(userId);
  if (!gang) return msg.reply("❌ You must be in a gang.");

  const activeWar = getActiveTerritoryWar();
  if (!activeWar) return msg.reply("❌ No active territory war.");

  const territory = getTerritory(activeWar.territoryId);
  if (territory?.controlledBy !== gang.id) return msg.reply("❌ Your gang doesn't control this territory.");

  const pts = Math.floor(Math.random() * 40) + 15 + gang.upgrades.security * 8;
  activeWar.attackers[gang.id] = (activeWar.attackers[gang.id] || 0) + pts;
  setActiveTerritoryWar(activeWar);
  const m = gang.members.find((m) => m.userId === userId);
  if (m) { m.defends++; updateGang(gang); }
  return msg.reply(`🛡️ Defended **${territory.emoji} ${territory.name}**! +${pts} pts for **${gang.emoji} ${gang.name}**!`);
}

async function endWar(channel) {
  const war = getActiveTerritoryWar();
  if (!war) return;
  war.active = false;
  setActiveTerritoryWar(null);

  const territory = getTerritory(war.territoryId);
  if (!territory) return;

  let winnerId = "", maxPts = -1;
  for (const [gId, pts] of Object.entries(war.attackers)) {
    if (pts > maxPts) { maxPts = pts; winnerId = gId; }
  }

  const gangs  = getAllGangs();
  const winner = winnerId ? gangs.find((g) => g.id === winnerId) : null;
  if (winner) {
    territory.controlledBy = winner.id;
    updateTerritory(territory);
    winner.xp += 100; winner.bank += 200; updateGang(winner);
  }

  const scoreboard = Object.entries(war.attackers)
    .sort(([,a],[,b]) => b - a)
    .map(([gId, pts]) => { const g = gangs.find((x) => x.id === gId); return `${g?.emoji||"❓"} **${g?.name||"Unknown"}** — ${pts} pts`; })
    .join("\n");

  await channel.send({ embeds: [
    new EmbedBuilder()
      .setTitle("🏁 Territory War Ended!")
      .setDescription(winner
        ? `**${winner.emoji} ${winner.name}** captured **${territory.emoji} ${territory.name}**!\n\n**Scoreboard:**\n${scoreboard}`
        : `Nobody captured **${territory.emoji} ${territory.name}**.\n\n**Scoreboard:**\n${scoreboard}`)
      .setColor(winner ? 0x57f287 : 0xed4245)
      .setFooter({ text: "Next war starts soon!" })
  ]});
}

async function startWar(msg) {
  if (getActiveTerritoryWar()) return msg.reply("❌ A war is already active.");
  const all  = getAllTerritories();
  const pool = all.filter((t) => !t.controlledBy);
  const t    = (pool.length ? pool : all)[Math.floor(Math.random() * (pool.length || all.length))];

  setActiveTerritoryWar({ territoryId: t.id, startTime: Date.now(), endTime: Date.now() + 15*60000, attackers: {}, active: true, channelId: msg.channel.id });
  await msg.channel.send({ embeds: [
    new EmbedBuilder().setTitle("⚠️ Territory War Started!")
      .setDescription(`**Location:** ${t.emoji} ${t.name}\n**Time:** 15 Minutes\n\nJoin: \`?attack ${t.name.toLowerCase()}\``)
      .setColor(0xed4245)
  ]});
  const iv = setInterval(async () => {
    const w = getActiveTerritoryWar();
    if (!w || !w.active) { clearInterval(iv); return; }
    if (Date.now() >= w.endTime) { clearInterval(iv); await endWar(msg.channel); }
  }, 10000);
  setWarInterval(iv);
  await msg.reply("✅ War started!");
}

async function stopWar(msg) {
  const iv = getWarInterval();
  if (iv) { clearInterval(iv); setWarInterval(null); }
  setActiveTerritoryWar(null);
  return msg.reply("🛑 Territory war stopped.");
}

async function handleLeaderboard(msg, args) {
  const type  = args[0]?.toLowerCase() || "bank";
  const gangs = getAllGangs();
  if (!gangs.length) return msg.reply("❌ No gangs yet.");
  const terrs = getAllTerritories();

  let sorted, title, getValue;
  if (type === "territory") {
    sorted   = [...gangs].sort((a,b) => terrs.filter((t)=>t.controlledBy===b.id).length - terrs.filter((t)=>t.controlledBy===a.id).length);
    title    = "🗺️ Leaderboard — Territories";
    getValue = (g) => `${terrs.filter((t)=>t.controlledBy===g.id).length} territories`;
  } else if (type === "xp") {
    sorted   = [...gangs].sort((a,b) => b.xp - a.xp);
    title    = "⭐ Leaderboard — XP";
    getValue = (g) => `${g.xp.toLocaleString()} XP`;
  } else {
    sorted   = [...gangs].sort((a,b) => b.bank - a.bank);
    title    = "💰 Leaderboard — Richest Gangs";
    getValue = (g) => `${g.bank.toLocaleString()} coins`;
  }

  const medals = ["🥇","🥈","🥉"];
  const lines  = sorted.slice(0,10).map((g,i) => `${medals[i]||`${i+1}.`} ${g.emoji} **${g.name}** — ${getValue(g)}`);
  return msg.reply({ embeds: [
    new EmbedBuilder().setTitle(title).setDescription(lines.join("\n")).setColor(0xfee75c)
      .setFooter({ text: "?leaderboard <bank|territory|xp>" })
  ]});
}
