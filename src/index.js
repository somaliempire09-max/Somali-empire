const {
  Client, GatewayIntentBits, Partials,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
} = require('discord.js');

const unoGame      = require('./games/uno');
const diceGame     = require('./games/dice');
const pokerGame    = require('./games/poker');
const rpsGame      = require('./games/rps');
const voteCommand  = require('./commands/vote');
const werewolfGame = require('./games/werewolf');

const { handleGangMessage }                                            = require('./handlers/gangHandler');
const { buildWelcomeEmbed, handleWelcomeButton, handleWelcomeSelectMenu, handleWelcomeModal } = require('./handlers/welcomeHandler');
const { handleHelpSelect }                                             = require('./handlers/helpHandler');
const { getWelcomeConfig }                                             = require('./data/store');

const PREFIX = '?';

// Gang/welcome commands — routed to gangHandler
const GANG_COMMANDS = new Set(['help','territory','attack','defend','leaderboard','welcome','startwar','stopwar','gang']);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.GuildMember],
});

client.once('clientReady', (c) => {
  console.log(`✅ Bot is online! Logged in as ${c.user.tag}`);
  console.log(`📡 Serving ${c.guilds.cache.size} server(s)`);
  c.user.setActivity('?help | Games + Gang Wars 🎮');
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args    = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const command = args.shift().toLowerCase();

  // Gang / Welcome / Territory / Leaderboard / Help
  if (GANG_COMMANDS.has(command)) {
    return handleGangMessage(message, command, args);
  }

  // Games
  try {
    switch (command) {
      case 'uno':
        await unoGame.handle(message, args, client);
        break;
      case 'dice':
        await diceGame.handle(message, args);
        break;
      case 'poker':
        await pokerGame.handle(message, args);
        break;
      case 'rps':
        await rpsGame.handle(message, args);
        break;
      case 'vote':
        await voteCommand.handle(message, args);
        break;
      case 'ww':
      case 'werewolf':
        await werewolfGame.handle(message, args, client);
        break;
      default:
        break; // Unknown commands silently ignored
    }
  } catch (err) {
    console.error('Command error:', err);
    await message.reply('⚠️ Khalad ayaa dhacay. Isku day mar kale.').catch(() => {});
  }
});

// Welcome system — fire when member joins
client.on('guildMemberAdd', async (member) => {
  try {
    const config = getWelcomeConfig(member.guild.id);
    if (!config.enabled || !config.channelId) return;
    if (config.antiBot && member.user.bot) return;

    const channel = await member.guild.channels.fetch(config.channelId).catch(() => null);
    if (!channel?.isTextBased()) return;

    const embed      = buildWelcomeEmbed(config, member);
    const components = [];
    if (config.buttons.length > 0) {
      const row = new ActionRowBuilder().addComponents(
        config.buttons.slice(0, 5).map((b) => {
          const btn = new ButtonBuilder().setLabel(b.label).setStyle(ButtonStyle.Link).setURL(b.url);
          if (b.emoji) btn.setEmoji(b.emoji);
          return btn;
        })
      );
      components.push(row);
    }

    const replace = (text) =>
      text.replace(/{user}/g,     `<@${member.id}>`)
          .replace(/{username}/g, member.user.username)
          .replace(/{server}/g,   member.guild.name)
          .replace(/{count}/g,    String(member.guild.memberCount));

    await channel.send({
      content: config.message ? replace(config.message) : undefined,
      embeds: [embed],
      components,
    });

    if (config.dmWelcome) {
      try { await member.send({ embeds: [embed] }); } catch {}
    }
    if (config.autoroleId) {
      try { await member.roles.add(config.autoroleId); } catch {}
    }
  } catch (err) {
    console.error('guildMemberAdd error:', err);
  }
});

// Interaction handler — welcome buttons/selects/modals + vote + help + werewolf
client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isButton()) {
      if (interaction.customId.startsWith('welcome_')) {
        return handleWelcomeButton(interaction);
      }
      // vote, werewolf, poker, uno buttons handled by their collectors — no action needed here
    } else if (interaction.isStringSelectMenu()) {
      if (interaction.customId.startsWith('welcome_')) {
        return handleWelcomeSelectMenu(interaction);
      }
      if (interaction.customId === 'help_category') {
        return handleHelpSelect(interaction);
      }
    } else if (interaction.isChannelSelectMenu() || interaction.isRoleSelectMenu()) {
      if (interaction.customId.startsWith('welcome_')) {
        return handleWelcomeSelectMenu(interaction);
      }
    } else if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith('welcome_')) {
        return handleWelcomeModal(interaction);
      }
    }
  } catch (err) {
    console.error('Interaction error:', err);
    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      try { await interaction.reply({ content: '❌ An error occurred.', ephemeral: true }); } catch {}
    }
  }
});

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('❌ DISCORD_TOKEN environment variable is not set!');
  process.exit(1);
}

client.login(token);
