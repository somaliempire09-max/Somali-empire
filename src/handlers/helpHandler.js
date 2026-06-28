import { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } from "discord.js";

const CATEGORIES = {
  welcome: {
    emoji: "🌸", name: "Welcome System", description: "Server-ka ku soo dhoweeya members cusub", color: 0xff79c6,
    fields: [
      { name: "`?welcome`", value: "Welcome Setup Panel-ka fur (Admin kaliya). 14 button oo config garaysa nidaamka soo dhawaynta." },
      { name: "📝 Edit Message", value: "Fariinta wax ka beddel. Isticmaal: `{user}` `{username}` `{server}` `{count}`" },
      { name: "🎨 Embed Color", value: "Midabka embed-ka dooro: Blue, Green, Red, Yellow, Purple, Orange, White, Black." },
      { name: "🖼️ Welcome Image", value: "Image URL geli oo embed-ka ku muuqda marka member yimaado." },
      { name: "🌄 Background", value: "Background image URL geli." },
      { name: "📢 Channel", value: "Channel-ka welcome embed-ka lagu diri doono dooro." },
      { name: "👤 Autorole", value: "Role-ka otomaatig ah loo siin doona member cusub kasta dooro." },
      { name: "🔘 Buttons", value: "Link buttons ku dar welcome embed-ka (masalan: Rules, Discord invite)." },
      { name: "📄 Embed Settings", value: "Title, Description, Footer, Author wax ka beddel." },
      { name: "🧪 Test Welcome", value: "Welcome message tijaabi." },
      { name: "👀 Preview", value: "Welcome embed-ka preview si keli ah kuugu tus." },
      { name: "🌐 Language", value: "Luqadda dooro: English, Somali, Arabic, Spanish, French, German, Turkish." },
      { name: "⚙️ Advanced", value: "DM Welcome iyo Anti-Bot settings." },
      { name: "🔄 Reset / ✅ Enable / ❌ Disable", value: "Config dib u celi, shid, ama dami." },
    ],
  },
  gang: {
    emoji: "🏴", name: "Gang Commands", description: "Gang samee, maamul, oo kooxaaga hogaami", color: 0xed4245,
    fields: [
      { name: "`?gang create <magac>`", value: "Gang cusub samee. Adiga ayaa noqonaya 👑 Leader." },
      { name: "`?gang join <magac>`",   value: "Gang jira ku biir. Waxaad noqonaysaa 🆕 Recruit." },
      { name: "`?gang leave`",          value: "Gang-kaaga ka tag. (Leader ma tagi karo)" },
      { name: "`?gang disband`",        value: "Gang-kaaga dhammaad (Leader kaliya)." },
      { name: "`?gang info [magac]`",   value: "Gang macluumaad: Leader, xubnaha, bank, dhulal, upgrades." },
      { name: "`?gang members [magac]`",value: "Xubnaha oo darajooyinkooda leh arag." },
      { name: "`?gang bank`",           value: "Gang-kaaga lacagta iyo dakhliga arag." },
      { name: "`?gang upgrade [nooc]`", value: "Upgrade-yada (Leader kaliya):\n`hq` `armory` `warehouse` `security` `medicalcenter`" },
      { name: "`?gang promote @user`",  value: "Xubna ranking kor u qaad (Leader kaliya)." },
      { name: "`?gang demote @user`",   value: "Xubna ranking hoos u dhig (Leader kaliya)." },
    ],
  },
  territory: {
    emoji: "🗺️", name: "Territory Wars", description: "Dhulal qabso oo gang-gaaga awoodda kordhii", color: 0x57f287,
    fields: [
      { name: "`?territory`", value: "Dhulalka oo dhan arag: cidda maamasha iyo dakhliga kasta.\n🏦 Downtown · 🏭 Industrial · 🌉 Harbor · 🌲 Forest\n✈️ Airport · 🚇 Metro · 🏘️ East Side · 🏜️ Desert" },
      { name: "`?attack <dhul>`", value: "Dhul weerari ama dagaal socda ku biir.\n• Armory Level sare = dhibco badan\n• Gang-ga ugu dhibcaha badan 15 daqiiqo gudahood wuu qabsadaa\n• Faa'iido: 💰 Dakhli maalinlaha + ⭐ XP + 🏆 Sumcad" },
      { name: "`?defend <dhul>`", value: "Dhulkaaga difaaci marka la weerarayo.\n• Security Level sare = difaac xoog badan" },
      { name: "`?startwar` 🔒", value: "Territory war bilaw — dhul random ah (Admin kaliya)." },
      { name: "`?stopwar` 🔒",  value: "War socda jooji (Admin kaliya)." },
    ],
  },
  mission: {
    emoji: "🎯", name: "Gang Missions", description: "Missions dhami oo coins, XP iyo Gang Points hel", color: 0xfee75c,
    fields: [
      { name: "`?gang mission list`",         value: "Missions-yada oo dhan arag." },
      { name: "`?gang mission start <id>`",   value: "Mission bilaw (Leader ama Co-Leader kaliya).\n\n**IDs:** `drug_delivery` `bank_heist` `hit_contract` `warehouse_raid` `vip_protection` `convoy_attack` `harbor_smuggle` `casino_heist`" },
      { name: "`?gang mission join`",         value: "Mission socota ku biir. Xubnaha badan = bonus rewards." },
      { name: "`?gang mission status`",       value: "Mission-ka hadda socda hubi." },
      { name: "📊 Success Rate",              value: "• Armory Level sare → guul badan\n• Security Level sare → guul badan\n• 2x min members → +50% bonus reward\n• Cooldown: **10 daqiiqo** ka dib mission kasta" },
    ],
  },
  leaderboard: {
    emoji: "🏆", name: "Leaderboard", description: "Gang-yada tartanka arag", color: 0xf1c40f,
    fields: [
      { name: "`?leaderboard` ama `?leaderboard bank`",      value: "Gang-yada ugu lacagta badan (Top 10)." },
      { name: "`?leaderboard territory`",                     value: "Gang-yada ugu dhulka badan (Top 10)." },
      { name: "`?leaderboard xp`",                           value: "Gang-yada ugu XP badan (Top 10)." },
    ],
  },
};

export async function handleHelpCommand(msg, args) {
  const sub = args[0]?.toLowerCase();
  if (sub) {
    const cat = CATEGORIES[sub];
    if (!cat) return msg.reply(`❌ Qaybta **${sub}** lama helin. Isticmaal: \`?help\``);
    return msg.reply({ embeds: [buildCategoryEmbed(sub, cat)] });
  }

  const embed = new EmbedBuilder()
    .setTitle("📖 Bot Help — Sharaxaad Buuxda")
    .setDescription([
      "**⚙️ Prefix:** `?`  |  **🔒 Admin commands:** Administrator permission",
      "",
      "🌸 **Welcome System** — Soo dhawaynta configure gare",
      "🏴 **Gang Commands** — Gang samee, ku biir, maamul",
      "🗺️ **Territory Wars** — Dhulal qabso, weeraro, difaac",
      "🎯 **Gang Missions** — Missions dhami, coins iyo XP hel",
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

export async function handleHelpSelect(interaction) {
  const key = interaction.values[0];
  const cat = CATEGORIES[key];
  if (!cat) return interaction.reply({ content: "❌ Qaybta lama helin.", ephemeral: true });
  await interaction.update({ embeds: [buildCategoryEmbed(key, cat)], components: interaction.message.components });
}
