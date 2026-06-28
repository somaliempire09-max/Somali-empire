import {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder,
  ModalBuilder, TextInputBuilder, TextInputStyle,
  StringSelectMenuBuilder, ChannelSelectMenuBuilder, RoleSelectMenuBuilder,
  ChannelType,
} from "discord.js";
import { getWelcomeConfig, updateWelcomeConfig, resetWelcomeConfig } from "../data/store.js";

export function buildWelcomePanel() {
  const embed = new EmbedBuilder()
    .setTitle("🌸 Welcome Setup Panel")
    .setDescription("Configure the welcome system for your server using the buttons below.")
    .setColor(0x5865f2)
    .setFooter({ text: "Click any button to configure that setting" });

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("welcome_edit_message").setLabel("Edit Message").setEmoji("📝").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("welcome_embed_color").setLabel("Embed Color").setEmoji("🎨").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("welcome_image").setLabel("Welcome Image").setEmoji("🖼️").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("welcome_background").setLabel("Background").setEmoji("🌄").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("welcome_channel").setLabel("Channel").setEmoji("📢").setStyle(ButtonStyle.Secondary),
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("welcome_autorole").setLabel("Autorole").setEmoji("👤").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("welcome_buttons").setLabel("Buttons").setEmoji("🔘").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("welcome_embed_settings").setLabel("Embed Settings").setEmoji("📄").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("welcome_test").setLabel("Test Welcome").setEmoji("🧪").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("welcome_preview").setLabel("Preview").setEmoji("👀").setStyle(ButtonStyle.Primary),
  );
  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("welcome_language").setLabel("Language").setEmoji("🌐").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("welcome_advanced").setLabel("Advanced").setEmoji("⚙️").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("welcome_reset").setLabel("Reset").setEmoji("🔄").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("welcome_enable").setLabel("Enable").setEmoji("✅").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("welcome_disable").setLabel("Disable").setEmoji("❌").setStyle(ButtonStyle.Danger),
  );

  return { embeds: [embed], components: [row1, row2, row3] };
}

export function buildWelcomeEmbed(config, member) {
  const replace = (text) =>
    text
      .replace(/{user}/g, `<@${member.id}>`)
      .replace(/{username}/g, member.user.username)
      .replace(/{server}/g, member.guild.name)
      .replace(/{count}/g, String(member.guild.memberCount))
      .replace(/{mention}/g, `<@${member.id}>`);

  const embed = new EmbedBuilder()
    .setColor(parseInt(config.embedColor.replace("#", ""), 16))
    .setTitle(replace(config.embedTitle))
    .setDescription(replace(config.embedDescription));

  if (config.embedFooter)    embed.setFooter({ text: replace(config.embedFooter) });
  if (config.embedAuthor)    embed.setAuthor({ name: replace(config.embedAuthor) });
  if (config.embedThumbnail) embed.setThumbnail(member.user.displayAvatarURL());
  if (config.embedTimestamp) embed.setTimestamp();
  if (config.welcomeImageUrl) embed.setImage(config.welcomeImageUrl);
  return embed;
}

export async function handleWelcomeButton(interaction) {
  const guildId = interaction.guildId;
  const config  = getWelcomeConfig(guildId);
  const id      = interaction.customId;

  if (id === "welcome_edit_message") {
    const modal = new ModalBuilder().setCustomId("welcome_modal_message").setTitle("Edit Welcome Message");
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("message").setLabel("Message ({user}, {server}, {count})").setStyle(TextInputStyle.Paragraph).setValue(config.message).setRequired(true)
      )
    );
    return interaction.showModal(modal);
  }
  if (id === "welcome_embed_color") {
    const select = new StringSelectMenuBuilder().setCustomId("welcome_select_color").setPlaceholder("Choose embed color").addOptions([
      { label: "Discord Blue", value: "#5865F2", emoji: "🔵" },
      { label: "Green",        value: "#57F287", emoji: "🟢" },
      { label: "Yellow",       value: "#FEE75C", emoji: "🟡" },
      { label: "Red",          value: "#ED4245", emoji: "🔴" },
      { label: "Purple",       value: "#9B59B6", emoji: "🟣" },
      { label: "Orange",       value: "#E67E22", emoji: "🟠" },
      { label: "White",        value: "#FFFFFF", emoji: "⚪" },
      { label: "Black",        value: "#000000", emoji: "⚫" },
    ]);
    return interaction.reply({ content: "🎨 **Choose a color:**", components: [new ActionRowBuilder().addComponents(select)], ephemeral: true });
  }
  if (id === "welcome_image") {
    const modal = new ModalBuilder().setCustomId("welcome_modal_image").setTitle("Welcome Image");
    modal.addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId("image_url").setLabel("Image URL (empty to remove)").setStyle(TextInputStyle.Short).setValue(config.welcomeImageUrl || "").setRequired(false)
    ));
    return interaction.showModal(modal);
  }
  if (id === "welcome_background") {
    const modal = new ModalBuilder().setCustomId("welcome_modal_background").setTitle("Background Image");
    modal.addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId("bg_url").setLabel("Background URL (empty to remove)").setStyle(TextInputStyle.Short).setValue(config.backgroundUrl || "").setRequired(false)
    ));
    return interaction.showModal(modal);
  }
  if (id === "welcome_channel") {
    const select = new ChannelSelectMenuBuilder().setCustomId("welcome_select_channel").setPlaceholder("Choose welcome channel").setChannelTypes(ChannelType.GuildText);
    return interaction.reply({ content: "📢 **Choose the welcome channel:**", components: [new ActionRowBuilder().addComponents(select)], ephemeral: true });
  }
  if (id === "welcome_autorole") {
    const select = new RoleSelectMenuBuilder().setCustomId("welcome_select_autorole").setPlaceholder("Choose auto-assign role");
    return interaction.reply({ content: "👤 **Choose the role to auto-assign:**", components: [new ActionRowBuilder().addComponents(select)], ephemeral: true });
  }
  if (id === "welcome_buttons") {
    const modal = new ModalBuilder().setCustomId("welcome_modal_buttons").setTitle("Add Welcome Button");
    modal.addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("btn_label").setLabel("Button Label").setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("btn_url").setLabel("Button URL").setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("btn_emoji").setLabel("Button Emoji (optional)").setStyle(TextInputStyle.Short).setRequired(false)),
    );
    return interaction.showModal(modal);
  }
  if (id === "welcome_embed_settings") {
    const modal = new ModalBuilder().setCustomId("welcome_modal_embed").setTitle("Embed Settings");
    modal.addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("embed_title").setLabel("Title").setStyle(TextInputStyle.Short).setValue(config.embedTitle).setRequired(false)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("embed_description").setLabel("Description").setStyle(TextInputStyle.Paragraph).setValue(config.embedDescription).setRequired(false)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("embed_footer").setLabel("Footer").setStyle(TextInputStyle.Short).setValue(config.embedFooter).setRequired(false)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("embed_author").setLabel("Author").setStyle(TextInputStyle.Short).setValue(config.embedAuthor).setRequired(false)),
    );
    return interaction.showModal(modal);
  }
  if (id === "welcome_test") {
    const cfg = getWelcomeConfig(guildId);
    if (!cfg.channelId) return interaction.reply({ content: "❌ No welcome channel set.", ephemeral: true });
    const channel = await interaction.guild.channels.fetch(cfg.channelId).catch(() => null);
    if (!channel?.isTextBased()) return interaction.reply({ content: "❌ Channel not found.", ephemeral: true });
    const embed = buildWelcomeEmbed(cfg, interaction.member);
    const components = buildButtonComponents(cfg);
    await channel.send({ content: "🧪 Test welcome:", embeds: [embed], components });
    return interaction.reply({ content: `✅ Test sent to <#${cfg.channelId}>!`, ephemeral: true });
  }
  if (id === "welcome_preview") {
    const cfg = getWelcomeConfig(guildId);
    const embed = buildWelcomeEmbed(cfg, interaction.member);
    return interaction.reply({ content: "👀 **Preview:**", embeds: [embed], components: buildButtonComponents(cfg), ephemeral: true });
  }
  if (id === "welcome_language") {
    const select = new StringSelectMenuBuilder().setCustomId("welcome_select_language").setPlaceholder("Choose language").addOptions([
      { label: "English", value: "en", emoji: "🇬🇧" },
      { label: "Somali",  value: "so", emoji: "🇸🇴" },
      { label: "Arabic",  value: "ar", emoji: "🇸🇦" },
      { label: "Spanish", value: "es", emoji: "🇪🇸" },
      { label: "French",  value: "fr", emoji: "🇫🇷" },
      { label: "German",  value: "de", emoji: "🇩🇪" },
      { label: "Turkish", value: "tr", emoji: "🇹🇷" },
    ]);
    return interaction.reply({ content: "🌐 **Choose bot language:**", components: [new ActionRowBuilder().addComponents(select)], ephemeral: true });
  }
  if (id === "welcome_advanced") {
    const modal = new ModalBuilder().setCustomId("welcome_modal_advanced").setTitle("Advanced Settings");
    modal.addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("dm_welcome").setLabel("DM Welcome? (yes/no)").setStyle(TextInputStyle.Short).setValue(config.dmWelcome ? "yes" : "no").setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("anti_bot").setLabel("Anti-Bot? (yes/no)").setStyle(TextInputStyle.Short).setValue(config.antiBot ? "yes" : "no").setRequired(true)),
    );
    return interaction.showModal(modal);
  }
  if (id === "welcome_reset") {
    resetWelcomeConfig(guildId);
    return interaction.reply({ content: "🔄 Welcome config reset to default!", ephemeral: true });
  }
  if (id === "welcome_enable") {
    config.enabled = true; updateWelcomeConfig(config);
    return interaction.reply({ content: "✅ Welcome system **enabled**!", ephemeral: true });
  }
  if (id === "welcome_disable") {
    config.enabled = false; updateWelcomeConfig(config);
    return interaction.reply({ content: "❌ Welcome system **disabled**!", ephemeral: true });
  }
}

function buildButtonComponents(cfg) {
  if (!cfg.buttons.length) return [];
  const row = new ActionRowBuilder().addComponents(
    cfg.buttons.slice(0, 5).map((b) => {
      const btn = new ButtonBuilder().setLabel(b.label).setStyle(ButtonStyle.Link).setURL(b.url);
      if (b.emoji) btn.setEmoji(b.emoji);
      return btn;
    })
  );
  return [row];
}

export async function handleWelcomeSelectMenu(interaction) {
  const guildId = interaction.guildId;
  const config  = getWelcomeConfig(guildId);
  const id      = interaction.customId;

  if (id === "welcome_select_color") {
    config.embedColor = interaction.values[0]; updateWelcomeConfig(config);
    return interaction.reply({ content: `🎨 Color set to **${interaction.values[0]}**!`, ephemeral: true });
  }
  if (id === "welcome_select_channel") {
    config.channelId = interaction.values[0]; updateWelcomeConfig(config);
    return interaction.reply({ content: `📢 Channel set to <#${interaction.values[0]}>!`, ephemeral: true });
  }
  if (id === "welcome_select_autorole") {
    config.autoroleId = interaction.values[0]; updateWelcomeConfig(config);
    return interaction.reply({ content: `👤 Auto-role set to <@&${interaction.values[0]}>!`, ephemeral: true });
  }
  if (id === "welcome_select_language") {
    config.language = interaction.values[0]; updateWelcomeConfig(config);
    return interaction.reply({ content: `🌐 Language set to **${interaction.values[0]}**!`, ephemeral: true });
  }
}

export async function handleWelcomeModal(interaction) {
  const guildId = interaction.guildId;
  const config  = getWelcomeConfig(guildId);
  const id      = interaction.customId;

  if (id === "welcome_modal_message") {
    config.message = interaction.fields.getTextInputValue("message");
    updateWelcomeConfig(config);
    return interaction.reply({ content: "📝 Welcome message updated!", ephemeral: true });
  }
  if (id === "welcome_modal_image") {
    const url = interaction.fields.getTextInputValue("image_url").trim();
    config.welcomeImageUrl = url || null; updateWelcomeConfig(config);
    return interaction.reply({ content: url ? "🖼️ Image set!" : "🖼️ Image removed!", ephemeral: true });
  }
  if (id === "welcome_modal_background") {
    const url = interaction.fields.getTextInputValue("bg_url").trim();
    config.backgroundUrl = url || null; updateWelcomeConfig(config);
    return interaction.reply({ content: url ? "🌄 Background set!" : "🌄 Background removed!", ephemeral: true });
  }
  if (id === "welcome_modal_buttons") {
    const label = interaction.fields.getTextInputValue("btn_label");
    const url   = interaction.fields.getTextInputValue("btn_url");
    const emoji = interaction.fields.getTextInputValue("btn_emoji");
    config.buttons.push({ label, url, emoji: emoji || undefined });
    updateWelcomeConfig(config);
    return interaction.reply({ content: `🔘 Button **${label}** added! (${config.buttons.length}/5)`, ephemeral: true });
  }
  if (id === "welcome_modal_embed") {
    const title = interaction.fields.getTextInputValue("embed_title");
    const desc  = interaction.fields.getTextInputValue("embed_description");
    const foot  = interaction.fields.getTextInputValue("embed_footer");
    const auth  = interaction.fields.getTextInputValue("embed_author");
    if (title) config.embedTitle       = title;
    if (desc)  config.embedDescription = desc;
    if (foot)  config.embedFooter      = foot;
    if (auth !== undefined) config.embedAuthor = auth;
    updateWelcomeConfig(config);
    return interaction.reply({ content: "📄 Embed settings updated!", ephemeral: true });
  }
  if (id === "welcome_modal_advanced") {
    config.dmWelcome = interaction.fields.getTextInputValue("dm_welcome").toLowerCase() === "yes";
    config.antiBot   = interaction.fields.getTextInputValue("anti_bot").toLowerCase()   === "yes";
    updateWelcomeConfig(config);
    return interaction.reply({ content: `⚙️ Advanced updated!\nDM Welcome: **${config.dmWelcome}** | Anti-Bot: **${config.antiBot}**`, ephemeral: true });
  }
}
