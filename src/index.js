import {
  Client, GatewayIntentBits, Partials,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
} from "discord.js";
import { handleMessage } from "./handlers/gangHandler.js";
import { handleWelcomeButton, handleWelcomeSelectMenu, handleWelcomeModal, buildWelcomeEmbed } from "./handlers/welcomeHandler.js";
import { handleHelpSelect } from "./handlers/helpHandler.js";
import { getWelcomeConfig } from "./data/store.js";

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error("❌ DISCORD_TOKEN environment variable is not set!");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.GuildMember],
});

client.once("clientReady", (c) => {
  console.log(`✅ Bot logged in as ${c.user.tag}`);
  console.log(`📡 Serving ${c.guilds.cache.size} server(s)`);
});

client.on("messageCreate", async (msg) => {
  try {
    await handleMessage(msg);
  } catch (err) {
    console.error("Error handling message:", err);
  }
});

client.on("guildMemberAdd", async (member) => {
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

    await channel.send({ content: config.message ? replace(config.message) : undefined, embeds: [embed], components });

    if (config.dmWelcome) {
      try { await member.send({ embeds: [embed] }); } catch {}
    }
    if (config.autoroleId) {
      try { await member.roles.add(config.autoroleId); } catch {}
    }
  } catch (err) {
    console.error("Error in guildMemberAdd:", err);
  }
});

client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isButton()) {
      if (interaction.customId.startsWith("welcome_")) {
        await handleWelcomeButton(interaction);
      }
    } else if (interaction.isStringSelectMenu()) {
      if (interaction.customId.startsWith("welcome_")) {
        await handleWelcomeSelectMenu(interaction);
      } else if (interaction.customId === "help_category") {
        await handleHelpSelect(interaction);
      }
    } else if (interaction.isChannelSelectMenu() || interaction.isRoleSelectMenu()) {
      if (interaction.customId.startsWith("welcome_")) {
        await handleWelcomeSelectMenu(interaction);
      }
    } else if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith("welcome_")) {
        await handleWelcomeModal(interaction);
      }
    }
  } catch (err) {
    console.error("Interaction error:", err);
    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      try { await interaction.reply({ content: "❌ An error occurred.", ephemeral: true }); } catch {}
    }
  }
});

client.login(token);
