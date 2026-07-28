const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require('discord.js');

// Active polls keyed by messageId
const activePolls = new Map();

// Parse duration string like "5m", "1h", "30s", "2h30m"
function parseDuration(str) {
  if (!str) return null;
  const s = str.toLowerCase().trim();
  let total = 0;
  const matches = s.matchAll(/(\d+)(h|m|s)/g);
  let found = false;
  for (const m of matches) {
    found = true;
    const n = parseInt(m[1]);
    if (m[2] === 'h') total += n * 3600;
    else if (m[2] === 'm') total += n * 60;
    else if (m[2] === 's') total += n;
  }
  if (!found) {
    // Try plain number as minutes
    const num = parseInt(s);
    if (!isNaN(num) && num > 0) total = num * 60;
  }
  return total > 0 ? total : null;
}

function buildProgressBar(count, total, barLength = 20) {
  const pct = total === 0 ? 0 : count / total;
  const filled = Math.round(pct * barLength);
  const empty = barLength - filled;
  const bar = '▓'.repeat(filled) + '░'.repeat(empty);
  const pctStr = (pct * 100).toFixed(2) + '%';
  return `${bar} | ${pctStr} (${count})`;
}

function buildEmbed(title, options, votes, authorTag, endsAt, closed) {
  const total = Object.values(votes).reduce((a, b) => a + b, 0);

  let timeField;
  if (closed) {
    timeField = '🔒 **Codeyntu waa la xirtay**';
  } else if (endsAt) {
    const unixSec = Math.floor(endsAt / 1000);
    timeField = `⏰ Waxay dhammaneysaa: <t:${unixSec}:R> (<t:${unixSec}:t>)`;
  } else {
    timeField = '♾️ Waqti la\'aan (gacanta ayaa la xiri kara)';
  }

  const embed = new EmbedBuilder()
    .setColor(closed ? 0x808080 : 0x5865F2)
    .setTitle(`🗳️ ${title}`)
    .setDescription(closed ? 'Codeyntu waa la xirtay.' : `Option taabo si aad u codeyso\n${timeField}`);

  for (let i = 0; i < options.length; i++) {
    const count = votes[i] || 0;
    embed.addFields({
      name: `**${options[i].toUpperCase()}**`,
      value: buildProgressBar(count, total),
    });
  }

  embed.addFields({
    name: 'Poll author',
    value: `@${authorTag}`,
  });

  if (closed) {
    // Show winner
    const max = Math.max(...Object.values(votes));
    const winners = options.filter((_, i) => (votes[i] || 0) === max);
    if (total > 0) {
      embed.addFields({
        name: '🏆 Natiijada',
        value: winners.map(w => `**${w}**`).join(', ') + ` — ${max} cod`,
      });
    }
  }

  embed.setTimestamp();
  return embed;
}

function buildVoteRows(options, pollId, closed) {
  const rows = [];
  const buttons = options.map((_, i) =>
    new ButtonBuilder()
      .setCustomId(`vote_${pollId}_opt_${i}`)
      .setLabel(`Option ${i + 1}`)
      .setStyle(ButtonStyle.Primary)
      .setDisabled(closed)
  );

  for (let i = 0; i < buttons.length; i += 4) {
    rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 4)));
  }
  return rows;
}

function buildCloseRow(pollId, authorId, closed) {
  const btn = new ButtonBuilder()
    .setCustomId(`vote_${pollId}_close_${authorId}`)
    .setLabel('🔒 Codeynta Xir')
    .setStyle(ButtonStyle.Danger)
    .setDisabled(closed);
  return new ActionRowBuilder().addComponents(btn);
}

async function closePoll(pollMsg, poll, reason) {
  if (poll.closed) return;
  poll.closed = true;
  if (poll.collector) poll.collector.stop(reason || 'closed');

  const finalEmbed = buildEmbed(poll.title, poll.options, poll.votes, poll.authorTag, poll.endsAt, true);
  const disabledVoteRows = buildVoteRows(poll.options, poll.pollId, true);
  const disabledCloseRow = buildCloseRow(poll.pollId, poll.authorId, true);
  await pollMsg.edit({ embeds: [finalEmbed], components: [...disabledVoteRows, disabledCloseRow] }).catch(() => {});
}

async function handle(message, args) {
  if (!args.length) {
    return message.reply(
      '❌ Fadlan geli cinwaanka iyo doorashooyinka.\n' +
      'Tusaale: `?vote 10m Su\'aal | Doorasho 1 | Doorasho 2`\n' +
      'Waqtiga: `30s`, `5m`, `1h`, `1h30m` — ama iska daa si ay u tahay waqti la\'aan.'
    );
  }

  // Check if first arg is a duration
  let durationSec = null;
  let fullText = args.join(' ');

  const firstArg = args[0];
  const trialDuration = parseDuration(firstArg);
  if (trialDuration !== null && firstArg.match(/^[\dhms]+$/i)) {
    durationSec = trialDuration;
    fullText = args.slice(1).join(' ');
  }

  const parts = fullText.split('|').map(s => s.trim()).filter(Boolean);
  const title = parts[0];
  const options = parts.slice(1);

  if (!title) return message.reply('❌ Fadlan ku dar cinwaanka codeynta.');
  if (options.length < 2) {
    return message.reply(
      '❌ Ugu yaraan 2 doorasho ayaad u baahan tahay.\n' +
      'Tusaale: `?vote 5m Su\'aal | A | B | C`'
    );
  }
  if (options.length > 8) {
    return message.reply('❌ Ugu badan 8 doorasho ayaad geli kartaa.');
  }

  const votes = {};
  for (let i = 0; i < options.length; i++) votes[i] = 0;
  const userVotes = {};

  const pollId = Date.now().toString(36);
  const endsAt = durationSec ? Date.now() + durationSec * 1000 : null;
  const timeoutMs = durationSec ? durationSec * 1000 : 7 * 24 * 60 * 60 * 1000; // 7 days max

  const embed = buildEmbed(title, options, votes, message.author.username, endsAt, false);
  const voteRows = buildVoteRows(options, pollId, false);
  const closeRow = buildCloseRow(pollId, message.author.id, false);

  try { await message.delete(); } catch {}

  const pollMsg = await message.channel.send({
    embeds: [embed],
    components: [...voteRows, closeRow],
  });

  const poll = {
    title,
    options,
    votes,
    userVotes,
    authorTag: message.author.username,
    authorId: message.author.id,
    endsAt,
    pollId,
    closed: false,
    collector: null,
  };
  activePolls.set(pollMsg.id, poll);

  // Auto-close timer
  let autoCloseTimer = null;
  if (durationSec) {
    autoCloseTimer = setTimeout(async () => {
      const p = activePolls.get(pollMsg.id);
      if (p && !p.closed) await closePoll(pollMsg, p, 'time');
    }, timeoutMs);
  }

  const collector = pollMsg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    filter: i => i.customId.startsWith(`vote_${pollId}_`),
    time: timeoutMs,
  });
  poll.collector = collector;

  collector.on('collect', async (interaction) => {
    const p = activePolls.get(pollMsg.id);
    if (!p || p.closed) {
      await interaction.reply({ content: '🔒 Codeyntu waa la xirtay.', ephemeral: true });
      return;
    }

    const parts2 = interaction.customId.split('_');
    // customId format: vote_<pollId>_opt_<i>  or  vote_<pollId>_close_<authorId>
    const action = parts2[2]; // 'opt' or 'close'

    if (action === 'close') {
      // Only author can close
      if (interaction.user.id !== p.authorId) {
        await interaction.reply({ content: '❌ Kaliya qofkii codeynta abuuray ayaa xiri kara.', ephemeral: true });
        return;
      }
      await interaction.deferUpdate();
      await closePoll(pollMsg, p, 'manual');
      return;
    }

    // Vote option
    const optionIdx = parseInt(parts2[3], 10);
    const uid = interaction.user.id;

    const prev = p.userVotes[uid];
    if (prev === optionIdx) {
      await interaction.reply({ content: `ℹ️ Horay u codaysay **${p.options[optionIdx]}**.`, ephemeral: true });
      return;
    }

    const prevOptionName = prev !== undefined ? p.options[prev] : null;

    if (prev !== undefined) {
      p.votes[prev] = Math.max(0, p.votes[prev] - 1);
    }
    p.votes[optionIdx] = (p.votes[optionIdx] || 0) + 1;
    p.userVotes[uid] = optionIdx;

    const newOptionName = p.options[optionIdx];
    const confirmMsg = prevOptionName
      ? `🔄 Codkaagii hore wuxuu ahaa **${prevOptionName}**, hadda waxaad u bedeshay **${newOptionName}**.`
      : `✅ Waxaad u codaysay **${newOptionName}**.`;

    const updated = buildEmbed(p.title, p.options, p.votes, p.authorTag, p.endsAt, false);
    await interaction.deferUpdate();
    await pollMsg.edit({ embeds: [updated], components: [...voteRows, closeRow] });
    await interaction.followUp({ content: confirmMsg, ephemeral: true });
  });

  collector.on('end', async (_, reason) => {
    clearTimeout(autoCloseTimer);
    const p = activePolls.get(pollMsg.id);
    if (p && !p.closed) await closePoll(pollMsg, p, reason);
    activePolls.delete(pollMsg.id);
  });
}

module.exports = { handle };
