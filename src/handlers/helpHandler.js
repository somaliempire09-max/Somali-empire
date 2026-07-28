const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

const CATEGORIES = {
  welcome: {
    emoji: "🌸", name: "Welcome System", description: "Server-ka ku soo dhoweeya members cusub", color: 0xff79c6,
    fields: [
      { name: "`?welcome`", value: "Welcome Setup Panel-ka fur (Admin kaliya)." },
      { name: "📝 Edit Message", value: "Fariinta wax ka beddel. Isticmaal: `{user}` `{username}` `{server}` `{count}`" },
      { name: "🎨 Embed Color", value: "Midabka embed-ka dooro." },
      { name: "🖼️ Welcome Image", value: "Image URL geli." },
      { name: "📢 Channel", value: "Channel-ka welcome embed-ka lagu diri doono dooro." },
      { name: "👤 Autorole", value: "Role-ka otomaatig ah loo siin doona member cusub." },
      { name: "🔘 Buttons", value: "Link buttons ku dar welcome embed-ka." },
      { name: "📄 Embed Settings", value: "Title, Description, Footer, Author wax ka beddel." },
      { name: "🧪 Test Welcome", value: "Welcome message tijaabi." },
      { name: "✅ Enable / ❌ Disable", value: "Welcome system shid ama dami." },
    ],
  },
  gang: {
    emoji: "🏴", name: "Gang Commands", description: "Gang samee, maamul, oo kooxaaga hogaami", color: 0xed4245,
    fields: [
      { name: "`?gang create <magac>`", value: "Gang cusub samee. Adiga ayaa noqonaya 👑 Leader." },
      { name: "`?gang join <magac>`",   value: "Gang jira ku biir." },
      { name: "`?gang leave`",          value: "Gang-kaaga ka tag." },
      { name: "`?gang disband`",        value: "Gang-kaaga dhammaad (Leader kaliya)." },
      { name: "`?gang info [magac]`",   value: "Gang macluumaad." },
      { name: "`?gang members [magac]`",value: "Xubnaha arag." },
      { name: "`?gang bank`",           value: "Lacagta arag." },
      { name: "`?gang upgrade [nooc]`", value: "Upgrade: `hq` `armory` `warehouse` `security` `medicalcenter`" },
      { name: "`?gang promote @user`",  value: "Xubna ranking kor u qaad." },
      { name: "`?gang demote @user`",   value: "Xubna ranking hoos u dhig." },
    ],
  },
  territory: {
    emoji: "🗺️", name: "Territory Wars", description: "Dhulal qabso oo gang-gaaga awoodda kordhii", color: 0x57f287,
    fields: [
      { name: "`?territory`", value: "Dhulalka oo dhan arag." },
      { name: "`?attack <dhul>`", value: "Dhul weerari ama dagaal socda ku biir." },
      { name: "`?defend <dhul>`", value: "Dhulkaaga difaaci." },
      { name: "`?startwar` 🔒", value: "Territory war bilaw (Admin kaliya)." },
      { name: "`?stopwar` 🔒",  value: "War socda jooji (Admin kaliya)." },
    ],
  },
  mission: {
    emoji: "🎯", name: "Gang Missions", description: "Missions dhami oo coins, XP iyo Gang Points hel", color: 0xfee75c,
    fields: [
      { name: "`?gang mission list`",         value: "Missions-yada oo dhan arag." },
      { name: "`?gang mission start <id>`",   value: "Mission bilaw (Leader ama Co-Leader)." },
      { name: "`?gang mission join`",         value: "Mission socota ku biir." },
      { name: "`?gang mission status`",       value: "Mission-ka hadda socda hubi." },
    ],
  },
  games: {
    emoji: "🎮", name: "Games", description: "Ciyaaraha botka", color: 0x5865f2,
    fields: [
      { name: "`?dice [@user]`",        value: "Shax tuur — keligaa ama qof kale kula tartam." },
      { name: "`?rps rock/paper/scissors`", value: "Rock Paper Scissors vs bot." },
      { name: "`?poker`",               value: "5-card draw poker." },
      { name: "`?uno join/start/play/draw/hand/status/stop`", value: "Multiplayer UNO." },
      { name: "`?ww` ama `?werewolf`",  value: "Werewolf game — roles, night/day phases." },
      { name: "`?vote [duration] Su'aal | A | B`", value: "Codeyn leh progress bars." },
    ],
  },
  leaderboard: {
    emoji: "🏆", name: "Leaderboard", description: "Gang-yada tartanka arag", color: 0xf1c40f,
    fields: [
      { name: "`?leaderboard`",               value: "Gang-yada ugu lacagta badan (Top 10)." },
      { name: "`?leaderboard territory`",     value: "Gang-yada ugu dhulka badan." },
      { name: "`?leaderboard xp`",            value: "Gang-yada ugu XP badan." },
    ],
  },
};

async function handleHelpCommand(msg, args) {
  const sub = args[0]?.toLowerCase();
  if (sub) {
    const cat = CATEGORIES[sub];
    if (!cat) return msg.reply(`❌ Qaybta **${sub}** lama helin. Isticmaal: \`?help\``);
    return msg.reply({ embeds: [buildCategoryEmbed(sub, cat)] });
  }

  const embed = new EmbedBuilder()
    .setTitle("📖 Somali Empire Bot — Help")
    .setDescription([
      "**⚙️ Prefix:** `?`  |  **🔒 Admin commands:** Administrator permission",
      "",
      "🌸 **Welcome System** — Soo dhawaynta configure gare",
      "🏴 **Gang Commands** — Gang samee, ku biir, maamul",
      "🗺️ **Territory Wars** — Dhulal qabso, weeraro, difaac",
      "🎯 **Gang Missions** — Missions dhami, coins iyo XP hel",
      "🎮 **Games** — Dice, RPS, Poker, UNO, Werewolf, Vote",
      "🏆 **Leaderboard** — Tartanka arag",
      "",
      "👇 **Hoos qaybta dooro si aad faahfaahin u aragto**",
    ].join("\n"))
    .setColor(0x5865f2)
    .setTimestamp();

  const select = new StringSelectMenuBuilder()
    .setCustomId("help_category")
    .setPlaceholder("📂 Qaybta dooro...")
    .addOptions(
      Object.entries(CATEGORIES).map(([key, cat]) => ({
        label: cat.name, value: key, emoji: cat.emoji, description: cat.description,
      }))
    );

  await msg.reply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(select)] });
}

function buildCategoryEmbed(key, cat) {
  const embed = new EmbedBuilder()
    .setTitle(`${cat.emoji} ${cat.name}`)
    .setDescription(cat.description)
    .setColor(cat.color)
    .setFooter({ text: "?help — Bogga hore ku noqo" })
    .setTimestamp();
  for (const f of cat.fields) embed.addFields({ name: f.name, value: f.value, inline: false });
  return embed;
}

async function handleHelpSelect(interaction) {
  const key = interaction.values[0];
  const cat = CATEGORIES[key];
  if (!cat) return interaction.reply({ content: "❌ Qaybta lama helin.", ephemeral: true });
  await interaction.update({ embeds: [buildCategoryEmbed(key, cat)], components: interaction.message.components });
}

module.exports = { handleHelpCommand, handleHelpSelect };
