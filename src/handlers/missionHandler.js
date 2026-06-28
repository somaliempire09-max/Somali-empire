import { EmbedBuilder } from "discord.js";
import { getUserGang, updateGang } from "../data/store.js";

export const MISSIONS = [
  { id: "bank_heist",      name: "Bank Heist",       emoji: "🏦", description: "Rob the downtown bank.",                       duration: 5*60000, minMembers: 2, rewards: { coins: 3000,  xp: 150, gangPoints: 20  }, difficulty: "Medium",    armoryRequired: 1 },
  { id: "drug_delivery",   name: "Drug Delivery",    emoji: "🚗", description: "Deliver a suspicious package undetected.",    duration: 3*60000, minMembers: 1, rewards: { coins: 1200,  xp: 80,  gangPoints: 10  }, difficulty: "Easy",      armoryRequired: 0 },
  { id: "convoy_attack",   name: "Convoy Attack",    emoji: "🚛", description: "Ambush an armored convoy.",                   duration: 8*60000, minMembers: 3, rewards: { coins: 6000,  xp: 300, gangPoints: 40  }, difficulty: "Hard",      armoryRequired: 2 },
  { id: "vip_protection",  name: "VIP Protection",   emoji: "🛡️", description: "Escort a VIP through enemy territory.",       duration: 6*60000, minMembers: 2, rewards: { coins: 4000,  xp: 200, gangPoints: 30  }, difficulty: "Hard",      armoryRequired: 1 },
  { id: "casino_heist",    name: "Casino Heist",     emoji: "🎰", description: "The biggest score in the city.",              duration:12*60000, minMembers: 4, rewards: { coins: 15000, xp: 600, gangPoints: 100 }, difficulty: "Legendary", armoryRequired: 3 },
  { id: "warehouse_raid",  name: "Warehouse Raid",   emoji: "🏭", description: "Break into the industrial warehouse.",        duration: 4*60000, minMembers: 2, rewards: { coins: 2000,  xp: 120, gangPoints: 15  }, difficulty: "Easy",      armoryRequired: 0 },
  { id: "harbor_smuggle",  name: "Harbor Smuggling", emoji: "🚢", description: "Smuggle goods through the harbor.",           duration: 7*60000, minMembers: 3, rewards: { coins: 5000,  xp: 250, gangPoints: 35  }, difficulty: "Hard",      armoryRequired: 2 },
  { id: "hit_contract",    name: "Hit Contract",     emoji: "🎯", description: "Carry out a contract hit on a rival target.", duration: 5*60000, minMembers: 1, rewards: { coins: 2500,  xp: 130, gangPoints: 18  }, difficulty: "Medium",    armoryRequired: 1 },
];

const DIFF_COLORS = { Easy: 0x57f287, Medium: 0xfee75c, Hard: 0xed4245, Legendary: 0x9b59b6 };

const activeMissions  = new Map();
const missionCooldowns = new Map();

function getMission(id) { return MISSIONS.find((m) => m.id === id); }

export async function handleMissionCommand(msg, args) {
  const sub = args[0]?.toLowerCase();
  if (!sub || sub === "list") return showList(msg);
  if (sub === "start")  return startMission(msg, args.slice(1));
  if (sub === "join")   return joinMission(msg);
  if (sub === "status") return missionStatus(msg);
  await msg.reply("Usage: `?gang mission <list|start <id>|join|status>`");
}

async function showList(msg) {
  const embed = new EmbedBuilder()
    .setTitle("🎯 Gang Missions")
    .setDescription("Start: `?gang mission start <id>` | Join: `?gang mission join`")
    .setColor(0x5865f2);
  for (const m of MISSIONS) {
    embed.addFields({
      name: `${m.emoji} ${m.name}  \`${m.id}\``,
      value: [
        `📖 ${m.description}`,
        `⏱️ **${m.duration/60000}min** | 👥 Min: **${m.minMembers}** | 🔫 Armory Lv${m.armoryRequired}+`,
        `💰 **${m.rewards.coins.toLocaleString()}** coins | ⭐ **${m.rewards.xp}** XP | 🏅 **${m.rewards.gangPoints}** GP | ${m.difficulty}`,
      ].join("\n"),
    });
  }
  await msg.reply({ embeds: [embed] });
}

async function startMission(msg, args) {
  const userId = msg.author.id;
  const gang   = getUserGang(userId);
  if (!gang) return msg.reply("❌ You must be in a gang.");

  const member = gang.members.find((m) => m.userId === userId);
  if (gang.leaderId !== userId && member?.rank !== "co-leader")
    return msg.reply("❌ Only the **Leader** or **Co-Leader** can start missions.");

  if (activeMissions.has(gang.id))
    return msg.reply("❌ Gang already has an active mission. Use `?gang mission status`.");

  const cooldownEnd = missionCooldowns.get(gang.id);
  if (cooldownEnd && Date.now() < cooldownEnd) {
    const rem = Math.ceil((cooldownEnd - Date.now()) / 60000);
    return msg.reply(`⏳ Cooldown! Next mission in **${rem} minute(s)**.`);
  }

  const missionId = args[0]?.toLowerCase();
  if (!missionId) return msg.reply("Usage: `?gang mission start <mission_id>`");

  const mission = getMission(missionId);
  if (!mission) return msg.reply(`❌ Mission **${missionId}** not found. Use \`?gang mission list\`.`);

  if (gang.upgrades.armory < mission.armoryRequired)
    return msg.reply(`❌ Requires Armory Level **${mission.armoryRequired}**. Yours: ${gang.upgrades.armory}.`);

  const active = { missionId: mission.id, gangId: gang.id, startTime: Date.now(), endTime: Date.now() + mission.duration, participants: [userId], channelId: msg.channel.id };
  activeMissions.set(gang.id, active);

  const embed = new EmbedBuilder()
    .setTitle(`${mission.emoji} Mission Started: ${mission.name}`)
    .setDescription(`**${gang.emoji} ${gang.name}** started a mission!\n\n📖 ${mission.description}\n\n⏱️ **${mission.duration/60000} min** | Min members: **${mission.minMembers}**\n\nMembers: type \`?gang mission join\` to join!`)
    .setColor(DIFF_COLORS[mission.difficulty])
    .addFields(
      { name: "💰 Coins", value: mission.rewards.coins.toLocaleString(), inline: true },
      { name: "⭐ XP",    value: String(mission.rewards.xp),             inline: true },
      { name: "🏅 GP",    value: String(mission.rewards.gangPoints),      inline: true },
      { name: "📊 Difficulty", value: mission.difficulty, inline: true },
      { name: "👤 Participants", value: `<@${userId}>`, inline: true },
    )
    .setTimestamp(new Date(active.endTime));

  await msg.channel.send({ embeds: [embed] });

  setTimeout(() => completeMission(gang.id, msg.client, active.channelId), mission.duration);
}

async function joinMission(msg) {
  const userId = msg.author.id;
  const gang   = getUserGang(userId);
  if (!gang) return msg.reply("❌ You must be in a gang.");

  const active = activeMissions.get(gang.id);
  if (!active) return msg.reply("❌ No active mission. Start one with `?gang mission start <id>`.");
  if (active.participants.includes(userId)) return msg.reply("❌ You are already in this mission!");

  active.participants.push(userId);
  activeMissions.set(gang.id, active);

  const mission = getMission(active.missionId);
  const rem = Math.ceil((active.endTime - Date.now()) / 60000);
  await msg.reply(`✅ Joined **${mission.emoji} ${mission.name}**! (${active.participants.length}/${mission.minMembers} needed) — ${rem}min left.`);
}

async function missionStatus(msg) {
  const userId = msg.author.id;
  const gang   = getUserGang(userId);
  if (!gang) return msg.reply("❌ You are not in a gang.");

  const active = activeMissions.get(gang.id);
  if (!active) return msg.reply("❌ No active mission.");

  const mission = getMission(active.missionId);
  const remSec  = Math.max(0, Math.floor((active.endTime - Date.now()) / 1000));
  const embed   = new EmbedBuilder()
    .setTitle(`${mission.emoji} Active Mission: ${mission.name}`)
    .setColor(DIFF_COLORS[mission.difficulty])
    .addFields(
      { name: "⏳ Time Remaining", value: `${Math.floor(remSec/60)}m ${remSec%60}s`, inline: true },
      { name: "👥 Participants",   value: `${active.participants.length}/${mission.minMembers}`, inline: true },
      { name: "🏅 Members",        value: active.participants.map((id) => `<@${id}>`).join(", "), inline: false },
      { name: "💰 Reward",         value: `${mission.rewards.coins.toLocaleString()} coins + ${mission.rewards.xp} XP`, inline: false },
    )
    .setTimestamp(new Date(active.endTime))
    .setFooter({ text: "Mission ends at" });
  await msg.reply({ embeds: [embed] });
}

async function completeMission(gangId, client, channelId) {
  const active = activeMissions.get(gangId);
  if (!active) return;
  activeMissions.delete(gangId);

  const mission = getMission(active.missionId);
  const gang    = getUserGang(active.participants[0]);
  if (!gang) return;

  const meetsMin     = active.participants.length >= mission.minMembers;
  const successChance = Math.min(meetsMin ? 0.55 + gang.upgrades.armory * 0.08 + gang.upgrades.security * 0.05 : 0.25, 0.95);
  const success       = Math.random() < successChance;

  missionCooldowns.set(gangId, Date.now() + 10 * 60000);

  const mentions = active.participants.map((id) => `<@${id}>`).join(", ");
  let embed;

  if (success) {
    const mult  = active.participants.length >= mission.minMembers * 2 ? 1.5 : 1;
    const coins = Math.floor(mission.rewards.coins * mult);
    const xp    = Math.floor(mission.rewards.xp * mult);
    gang.bank += coins;
    gang.xp   += xp;
    for (const uid of active.participants) {
      const m = gang.members.find((m) => m.userId === uid);
      if (m) m.xp += Math.floor(xp / active.participants.length);
    }
    updateGang(gang);
    embed = new EmbedBuilder()
      .setTitle(`✅ Mission Complete: ${mission.emoji} ${mission.name}`)
      .setDescription(`**${gang.emoji} ${gang.name}** completed the mission!${mult > 1 ? "\n🎉 **Bonus** for extra members!" : ""}`)
      .setColor(0x57f287)
      .addFields(
        { name: "💰 Coins",      value: `+${coins.toLocaleString()}`, inline: true },
        { name: "⭐ XP",         value: `+${xp}`,                    inline: true },
        { name: "🏅 Gang Points",value: `+${mission.rewards.gangPoints}`, inline: true },
        { name: "👥 Participants",value: mentions, inline: false },
      )
      .setFooter({ text: "Next mission available in 10 minutes" });
  } else {
    embed = new EmbedBuilder()
      .setTitle(`❌ Mission Failed: ${mission.emoji} ${mission.name}`)
      .setDescription(`**${gang.emoji} ${gang.name}** failed!\n${!meetsMin ? `⚠️ Not enough members (needed ${mission.minMembers}).` : "💀 Bad luck — operation went sideways."}`)
      .setColor(0xed4245)
      .addFields(
        { name: "👥 Participants", value: mentions, inline: false },
        { name: "💡 Tip", value: meetsMin ? "Upgrade Armory for better success." : `Get at least ${mission.minMembers} members.`, inline: false },
      )
      .setFooter({ text: "Next mission available in 10 minutes" });
  }

  try {
    const ch = await client.channels.fetch(channelId);
    if (ch?.isTextBased()) await ch.send({ embeds: [embed] });
  } catch {}
}
