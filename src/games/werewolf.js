const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ComponentType,
} = require('discord.js');

const games = new Map(); // keyed by channelId

const ROLES = {
  WEREWOLF:  { emoji: '🐺', name: 'Werewolf',   team: 'wolves'  },
  SEER:      { emoji: '👁️', name: 'Seer',        team: 'village' },
  DOCTOR:    { emoji: '🩺', name: 'Doctor',      team: 'village' },
  BODYGUARD: { emoji: '🛡️', name: 'Bodyguard',   team: 'village' },
  VILLAGER:  { emoji: '👤', name: 'Villager',    team: 'village' },
};

const LOBBY_VIDEO   = 'https://cdn.discordapp.com/attachments/1520781935339638864/1531406285356929285/lv_0_20260627230711.mp4?ex=6a6918be&is=6a67c73e&hm=b2b9780c95ec25d321f012128f91b79f5d8aa2dfca014f2c7f0aa797fe12fc35&';
const NIGHT_MS      = 60_000;
const DAY_MS        = 90_000;

// ─── helpers ────────────────────────────────────────────────────────────────

function assignRoles(count) {
  const pool = [];
  const wolves = count <= 4 ? 1 : count <= 6 ? 2 : 3;
  for (let i = 0; i < wolves; i++) pool.push('WEREWOLF');
  pool.push('SEER');
  if (count >= 5) pool.push('DOCTOR');
  if (count >= 6) pool.push('BODYGUARD');
  while (pool.length < count) pool.push('VILLAGER');
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

function getAlive(game) { return game.players.filter(p => !game.dead.has(p.id)); }
function getByRole(game, r) { return getAlive(game).filter(p => p.role === r); }

function checkWin(game) {
  const alive = getAlive(game);
  const wolves = alive.filter(p => p.role === 'WEREWOLF').length;
  const village = alive.filter(p => p.role !== 'WEREWOLF').length;
  if (wolves === 0) return 'village';
  if (wolves >= village) return 'wolves';
  return null;
}

// ─── lobby embed + rows ──────────────────────────────────────────────────────

function buildLobbyEmbed(game) {
  const ready = game.players.filter(p => game.ready.has(p.id));
  const playerLines = game.players.map(p => {
    const isHost  = p.id === game.hostId ? ' 👑' : '';
    const isReady = game.ready.has(p.id)  ? ' ✅' : ' ⏳';
    return `• **${p.username}**${isHost}${isReady}`;
  }).join('\n') || '*Ciyaartoyo ma jiraan weli*';

  const roleSummary = (() => {
    const c = game.players.length;
    if (c === 0) return '—';
    const wolves = c <= 4 ? 1 : c <= 6 ? 2 : 3;
    const parts = [`🐺×${wolves}`, '👁️×1'];
    if (c >= 5) parts.push('🩺×1');
    if (c >= 6) parts.push('🛡️×1');
    parts.push(`👤×${c - wolves - (c >= 6 ? 3 : c >= 5 ? 2 : 1)}`);
    return parts.join('  ');
  })();

  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('🐺 Werewolf — Lobbiga')
    .setDescription(
      `> Ku soo dhawoow! Taabo **🐺 Ku biir** si aad ugu biirto.\n` +
      `> Ugu yaraan **4 qof** ayaa loo baahan yahay.\n\n` +
      `👥 **Ciyaartoyda (${game.players.length}/12):**\n${playerLines}`
    )
    .addFields(
      { name: '🎭 Doorarka (marka la bilaabo)', value: roleSummary, inline: true },
      { name: '✅ Diyaar', value: `${ready.length}/${game.players.length}`, inline: true },
    )
    .setFooter({ text: `Host: ${game.hostUsername}  •  ?ww start si aad u bilowdo` })
    .setTimestamp();
}

function buildLobbyRows(channelId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`ww_lobby_join_${channelId}`)  .setLabel('Ku biir') .setEmoji('🐺').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`ww_lobby_leave_${channelId}`) .setLabel('Ka bax')  .setEmoji('🚪').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`ww_lobby_ready_${channelId}`) .setLabel('Diyaar')  .setEmoji('✅').setStyle(ButtonStyle.Primary),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`ww_lobby_kick_${channelId}`)  .setLabel('Ka saar qof').setEmoji('👢').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`ww_lobby_start_${channelId}`) .setLabel('Bilow')   .setEmoji('▶️').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`ww_lobby_stop_${channelId}`)  .setLabel('Jooji')   .setEmoji('🛑').setStyle(ButtonStyle.Danger),
    ),
  ];
}

// ─── lobby collector ─────────────────────────────────────────────────────────

async function startLobbyCollector(lobbyMsg, game, client) {
  const channelId = game.channelId;
  const collector = lobbyMsg.createMessageComponentCollector({
    time: 30 * 60_000, // 30 min lobby timeout
    filter: i => i.customId.includes(`_${channelId}`),
  });
  game.lobbyCollector = collector;

  collector.on('collect', async interaction => {
    const uid  = interaction.user.id;
    const uname = interaction.user.username;
    const action = interaction.customId.split('_')[2]; // join | leave | ready | kick | start | stop

    const isHost = uid === game.hostId;
    const inGame = !!game.players.find(p => p.id === uid);

    // ── JOIN ──
    if (action === 'join') {
      if (inGame)              return interaction.reply({ content: '⚠️ Waxaad horay ugu biirtay!', ephemeral: true });
      if (game.players.length >= 12) return interaction.reply({ content: '⚠️ Lobby-gu waa buuxday (12 qof).', ephemeral: true });
      game.players.push({ id: uid, username: uname, role: null });
      game.ready.delete(uid);
      await interaction.update({ embeds: [buildLobbyEmbed(game)], components: buildLobbyRows(channelId) });
      return;
    }

    // ── LEAVE ──
    if (action === 'leave') {
      if (!inGame) return interaction.reply({ content: '❌ Ma jirto ciyaar aad ku jirto.', ephemeral: true });
      if (uid === game.hostId) {
        // Transfer host to next player
        const next = game.players.find(p => p.id !== uid);
        if (next) { game.hostId = next.id; game.hostUsername = next.username; }
        else { games.delete(channelId); collector.stop('empty'); return interaction.update({ content: '🛑 Lobby-ga waa la xidhay (host wuu baxay).', embeds: [], components: [] }); }
      }
      game.players = game.players.filter(p => p.id !== uid);
      game.ready.delete(uid);
      await interaction.update({ embeds: [buildLobbyEmbed(game)], components: buildLobbyRows(channelId) });
      return;
    }

    // ── READY ──
    if (action === 'ready') {
      if (!inGame) return interaction.reply({ content: '❌ Marka hore ku biir ciyaarta.', ephemeral: true });
      if (game.ready.has(uid)) { game.ready.delete(uid); }
      else                     { game.ready.add(uid); }
      await interaction.update({ embeds: [buildLobbyEmbed(game)], components: buildLobbyRows(channelId) });
      return;
    }

    // ── KICK ──
    if (action === 'kick') {
      if (!isHost) return interaction.reply({ content: '❌ Kaliya host-ku ayaa qof saari kara.', ephemeral: true });
      const others = game.players.filter(p => p.id !== game.hostId);
      if (!others.length) return interaction.reply({ content: '❌ Saari karo ciyaartoyo kale ma jiraan.', ephemeral: true });
      const menu = new StringSelectMenuBuilder()
        .setCustomId(`ww_lobby_kicksel_${channelId}`)
        .setPlaceholder('Dooro qofka aad saareysaa…')
        .addOptions(others.map(p => ({ label: p.username, value: p.id, emoji: '👢' })));
      const row = new ActionRowBuilder().addComponents(menu);
      await interaction.reply({ content: '👢 **Cidda aad saareysaa dooro:**', components: [row], ephemeral: true });
      try {
        const sel = await interaction.channel.awaitMessageComponent({
          componentType: ComponentType.StringSelect,
          filter: i => i.customId === `ww_lobby_kicksel_${channelId}` && i.user.id === uid,
          time: 30_000,
        });
        const kickedId = sel.values[0];
        const kickedP  = game.players.find(p => p.id === kickedId);
        game.players  = game.players.filter(p => p.id !== kickedId);
        game.ready.delete(kickedId);
        await sel.update({ content: `✅ **${kickedP?.username}** lobby-ga ayaa laga saaray.`, components: [] });
        await lobbyMsg.edit({ embeds: [buildLobbyEmbed(game)], components: buildLobbyRows(channelId) });
      } catch { /* timed out */ }
      return;
    }

    // ── STOP ──
    if (action === 'stop') {
      if (!isHost) return interaction.reply({ content: '❌ Kaliya host-ku ayaa joojin kara.', ephemeral: true });
      games.delete(channelId);
      collector.stop('stopped');
      await interaction.update({ content: '🛑 **Lobby-ga waa la xidhay.**', embeds: [], components: [] });
      return;
    }

    // ── START ──
    if (action === 'start') {
      if (!isHost) return interaction.reply({ content: '❌ Kaliya host-ku ayaa bilaabin kara.', ephemeral: true });
      if (game.players.length < 4) return interaction.reply({ content: '❌ Waxaad u baahan tahay ugu yaraan **4 qof**.', ephemeral: true });
      collector.stop('started');
      await interaction.update({ embeds: [buildLobbyEmbed(game)], components: [] });
      await launchGame(game, interaction.channel, client);
      return;
    }
  });

  collector.on('end', (_, reason) => {
    if (reason === 'time') {
      games.delete(channelId);
      lobbyMsg.edit({ content: '⌛ Lobby-ga waqtigiisu dhamaaday.', embeds: [], components: [] }).catch(() => {});
    }
  });
}

// ─── game launch ─────────────────────────────────────────────────────────────

async function launchGame(game, channel, client) {
  const roleKeys = assignRoles(game.players.length);
  game.players.forEach((p, i) => { p.role = roleKeys[i]; });
  game.phase = 'starting';
  game.round = 1;
  game.dead  = new Set();

  const embed = new EmbedBuilder()
    .setColor(0x23272A)
    .setTitle('🐺 Werewolf — Ciyaartu Biloowday!')
    .setDescription(
      `**${game.players.length}** qof ayaa ka qeybgalaya.\n\n` +
      `📩 **Doorkaaga qarsoon waa laguu diray DM — Fiiri!**\n\n` +
      `👥 Ciyaartoyda:\n${game.players.map(p => `• ${p.username}`).join('\n')}`
    )
    .setTimestamp();
  await channel.send({ embeds: [embed] });

  // DM each player their role
  const roleDescriptions = {
    WEREWOLF:  (p) => `🐺 Adigu Werewolf baad tahay!\nWolves-kaaga: **${game.players.filter(x => x.role === 'WEREWOLF').map(x => x.username).join(', ')}**\nHab kasta dooro qof aad dilayso.`,
    SEER:      ()  => `👁️ Adigu **Seer** baad tahay!\nHab kasta waxaad hubinaysaa hal qof — Werewolf ma yahay iyo in kale.`,
    DOCTOR:    ()  => `🩺 Adigu **Doctor** baad tahay!\nHab kasta waxaad badbaadin kartaa hal qof (adiga laftigaa ku jirta).`,
    BODYGUARD: ()  => `🛡️ Adigu **Bodyguard** baad tahay!\nHab kasta waxaad ilaalin kartaa hal qof (adiga ma badbaadin kartid).`,
    VILLAGER:  ()  => `👤 Adigu **Villager** baad tahay!\nAwood gaar ah ma lihid. Dood iyo codeyn ayaad u isticmaaleysaa si aad u saarto Werewolves-ka.`,
  };

  for (const p of game.players) {
    try {
      const u = await client.users.fetch(p.id);
      const r = ROLES[p.role];
      await u.send(
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🎭 **DOORKAAGA: ${r.emoji} ${r.name.toUpperCase()}**\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        roleDescriptions[p.role](p)
      );
    } catch {}
  }

  setTimeout(() => runNight(game, channel, client), 3_000);
}

// ─── night phase ─────────────────────────────────────────────────────────────

async function sendNightDM(user, text, rows) {
  try {
    const dm = await user.createDM();
    return await dm.send({ content: text, components: rows });
  } catch { return null; }
}

function buildTargetRows(targets, actionKey, channelId, style) {
  const rows = [];
  for (let i = 0; i < targets.length; i += 4) {
    rows.push(new ActionRowBuilder().addComponents(
      targets.slice(i, i + 4).map(p =>
        new ButtonBuilder()
          .setCustomId(`ww_${actionKey}_${channelId}_${p.id}`)
          .setLabel(p.username)
          .setStyle(style)
      )
    ));
  }
  return rows;
}

async function runNight(game, channel, client) {
  game.phase = 'night';
  game.nightActions = { kill: null, save: null, guard: null };

  const unixEnd = Math.floor((Date.now() + NIGHT_MS) / 1000);
  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0x23272A)
        .setTitle('🌙 Habeenka wuu yimid…')
        .setDescription(
          `Dhammaan dadku waa seexday.\n` +
          `Doorarka gaarka ah waxay DM-ka ka helayaan badhannada.\n\n` +
          `⏰ Waqtiga: <t:${unixEnd}:R>`
        )
        .addFields({
          name: '👥 Nool',
          value: getAlive(game).map(p => `• ${p.username}`).join('\n'),
        })
        .setTimestamp(),
    ],
  });

  const nightPromises = [];

  // WEREWOLVES
  const wolves = getByRole(game, 'WEREWOLF');
  if (wolves.length) {
    const villagers = getAlive(game).filter(p => p.role !== 'WEREWOLF');
    const wolfRows  = buildTargetRows(villagers, `kill`, game.channelId, ButtonStyle.Danger);
    const wolfNames = wolves.map(w => `🐺 ${w.username}`).join(', ');
    for (const wolf of wolves) {
      nightPromises.push((async () => {
        const u   = await client.users.fetch(wolf.id).catch(() => null);
        if (!u) return;
        const msg = await sendNightDM(u, `🐺 **Habeenka!** Adigu Werewolf baad tahay.\n👥 Wolves: ${wolfNames}\n\n**Dooro qofka aad dileyso:**`, wolfRows);
        if (!msg) return;
        try {
          const i = await msg.awaitMessageComponent({ componentType: ComponentType.Button, filter: x => x.customId.startsWith(`ww_kill_${game.channelId}_`), time: NIGHT_MS });
          game.nightActions.kill = i.customId.split('_')[3];
          await i.update({ content: `✅ Doorashadaada: **${i.component.label}**`, components: [] });
        } catch {}
      })());
    }
  }

  // SEER
  const seers = getByRole(game, 'SEER');
  if (seers.length) {
    nightPromises.push((async () => {
      const u = await client.users.fetch(seers[0].id).catch(() => null);
      if (!u) return;
      const targets  = getAlive(game).filter(p => p.id !== seers[0].id);
      const seerRows = buildTargetRows(targets, `seer`, game.channelId, ButtonStyle.Primary);
      const msg = await sendNightDM(u, `👁️ **Habeenka!** Adigu Seer baad tahay.\n\n**Dooro qofka aad hubineyso:**`, seerRows);
      if (!msg) return;
      try {
        const i = await msg.awaitMessageComponent({ componentType: ComponentType.Button, filter: x => x.customId.startsWith(`ww_seer_${game.channelId}_`), time: NIGHT_MS });
        const target = game.players.find(p => p.id === i.customId.split('_')[3]);
        const isWolf = target?.role === 'WEREWOLF';
        await i.update({ content: `🔍 **${target?.username}** waa ${isWolf ? '🐺 **WEREWOLF!**' : '✅ **Werewolf ma aha.**'}`, components: [] });
      } catch {}
    })());
  }

  // DOCTOR
  const doctors = getByRole(game, 'DOCTOR');
  if (doctors.length) {
    nightPromises.push((async () => {
      const u = await client.users.fetch(doctors[0].id).catch(() => null);
      if (!u) return;
      const docRows = buildTargetRows(getAlive(game), `save`, game.channelId, ButtonStyle.Success);
      const msg = await sendNightDM(u, `🩺 **Habeenka!** Adigu Doctor baad tahay.\n\n**Dooro qofka aad badbaadineysaa:**`, docRows);
      if (!msg) return;
      try {
        const i = await msg.awaitMessageComponent({ componentType: ComponentType.Button, filter: x => x.customId.startsWith(`ww_save_${game.channelId}_`), time: NIGHT_MS });
        game.nightActions.save = i.customId.split('_')[3];
        await i.update({ content: `✅ Waxaad badbaadisay: **${i.component.label}**`, components: [] });
      } catch {}
    })());
  }

  // BODYGUARD
  const guards = getByRole(game, 'BODYGUARD');
  if (guards.length) {
    nightPromises.push((async () => {
      const u = await client.users.fetch(guards[0].id).catch(() => null);
      if (!u) return;
      const noSelf  = getAlive(game).filter(p => p.id !== guards[0].id);
      const gRows   = buildTargetRows(noSelf, `guard`, game.channelId, ButtonStyle.Primary);
      const msg = await sendNightDM(u, `🛡️ **Habeenka!** Adigu Bodyguard baad tahay.\n\n**Dooro qofka aad ilaalineysaa:**`, gRows);
      if (!msg) return;
      try {
        const i = await msg.awaitMessageComponent({ componentType: ComponentType.Button, filter: x => x.customId.startsWith(`ww_guard_${game.channelId}_`), time: NIGHT_MS });
        game.nightActions.guard = i.customId.split('_')[3];
        await i.update({ content: `✅ Waxaad ilaalinaysaa: **${i.component.label}**`, components: [] });
      } catch {}
    })());
  }

  await Promise.allSettled(nightPromises);
  await runDay(game, channel, client);
}

// ─── day phase ────────────────────────────────────────────────────────────────

async function runDay(game, channel, client) {
  game.phase = 'day';
  const { kill, save, guard } = game.nightActions;
  let deathAnnounce;

  if (kill) {
    const protected_ = (save === kill) || (guard === kill);
    if (protected_) {
      deathAnnounce = {
        color: 0x57F287,
        title: '🌅 Subax — Cid la dilin waayay!',
        desc: '🛡️ Habeenkii weerar ayaa dhacay laakiin qof la badbaadiyay!',
      };
    } else {
      const v = game.players.find(p => p.id === kill);
      if (v && !game.dead.has(v.id)) {
        game.dead.add(v.id);
        deathAnnounce = {
          color: 0xED4245,
          title: '🌅 Subax — Dhiig ayaa daatay!',
          desc: `💀 **${v.username}** ayaa habeenkii la dilay.\n${ROLES[v.role].emoji} Wuxuu ahaa **${ROLES[v.role].name}**.`,
        };
      }
    }
  } else {
    deathAnnounce = {
      color: 0xFEE75C,
      title: '🌅 Subax wanaagsan!',
      desc: 'Habeenkii waxba dhicin. Ciidanku wuu joogaa!',
    };
  }

  if (!deathAnnounce) deathAnnounce = { color: 0xFEE75C, title: '🌅 Subax', desc: '' };

  const winner = checkWin(game);
  if (winner) return endGame(game, channel, client, winner);

  const alive  = getAlive(game);
  const voteId = `wwvote_${game.channelId}_${game.round}`;
  game.dayVotes     = {};
  game.dayUserVotes = {};
  const unixEnd     = Math.floor((Date.now() + DAY_MS) / 1000);

  const voteRows = [];
  for (let i = 0; i < alive.length; i += 4) {
    voteRows.push(new ActionRowBuilder().addComponents(
      alive.slice(i, i + 4).map(p =>
        new ButtonBuilder()
          .setCustomId(`${voteId}_${p.id}`)
          .setLabel(p.username)
          .setEmoji('🗳️')
          .setStyle(ButtonStyle.Secondary)
      )
    ));
  }

  function buildDayEmbed() {
    const total = Object.values(game.dayVotes).reduce((a, b) => a + b, 0);
    const voteLines = alive.map(p => {
      const c   = game.dayVotes[p.id] || 0;
      const pct = total ? ((c / total) * 100).toFixed(1) : '0.0';
      const bar = '▓'.repeat(Math.round((c / Math.max(total, 1)) * 16)).padEnd(16, '░');
      return `**${p.username}**\n\`${bar}\` ${pct}% (${c})`;
    }).join('\n');

    const aliveList  = alive.map(p => `✅ ${p.username}`).join('\n');
    const deadList   = [...game.dead].map(id => {
      const p = game.players.find(x => x.id === id);
      return p ? `💀 ~~${p.username}~~ ${ROLES[p.role].emoji}` : '';
    }).filter(Boolean).join('\n');

    return new EmbedBuilder()
      .setColor(deathAnnounce.color)
      .setTitle(`${deathAnnounce.title} — Wareeg ${game.round}`)
      .setDescription(
        `${deathAnnounce.desc}\n\n` +
        `📊 **Codeyn — qofka ugu badan cod helaa waa la saari doonaa:**\n${voteLines}\n\n` +
        `⏰ Waqtiga: <t:${unixEnd}:R>`
      )
      .addFields(
        { name: `✅ Nool (${alive.length})`, value: aliveList || '—', inline: true },
        { name: `💀 Dhintay (${game.dead.size})`, value: deadList || '—', inline: true },
      )
      .setTimestamp();
  }

  const dayMsg = await channel.send({ embeds: [buildDayEmbed()], components: voteRows });

  const collector = dayMsg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    filter: i => i.customId.startsWith(`${voteId}_`),
    time: DAY_MS,
  });

  collector.on('collect', async interaction => {
    const uid      = interaction.user.id;
    const targetId = interaction.customId.split('_')[4];
    if (!game.players.find(p => p.id === uid) || game.dead.has(uid)) {
      return interaction.reply({ content: '❌ Kaliya ciyaartoyda nool ayaa codeyn kara.', ephemeral: true });
    }
    const prev = game.dayUserVotes[uid];
    if (prev) game.dayVotes[prev] = Math.max(0, (game.dayVotes[prev] || 0) - 1);
    game.dayVotes[targetId]     = (game.dayVotes[targetId] || 0) + 1;
    game.dayUserVotes[uid]      = targetId;
    await interaction.update({ embeds: [buildDayEmbed()], components: voteRows });
  });

  collector.on('end', async () => {
    await dayMsg.edit({ components: [] });
    const votes     = game.dayVotes;
    let max         = 0, eliminated = null, tied = false;
    for (const [pid, cnt] of Object.entries(votes)) {
      if (cnt > max)        { max = cnt; eliminated = pid; tied = false; }
      else if (cnt === max) { tied = true; }
    }

    if (!eliminated || tied || max === 0) {
      await channel.send('🤷 Cod kuma filna — cid la saarin wayday.');
    } else {
      const elim = game.players.find(p => p.id === eliminated);
      if (elim && !game.dead.has(elim.id)) {
        game.dead.add(elim.id);
        await channel.send({
          embeds: [new EmbedBuilder()
            .setColor(0x9B59B6)
            .setTitle('⚖️ Xukun — Qof la saarsay!')
            .setDescription(
              `**${elim.username}** ayaa la saarsay codeynta darteed.\n` +
              `${ROLES[elim.role].emoji} Wuxuu ahaa **${ROLES[elim.role].name}**.`
            )
            .setTimestamp()
          ],
        });
      }
    }

    const winner = checkWin(game);
    if (winner) return endGame(game, channel, client, winner);
    game.round++;
    await runNight(game, channel, client);
  });
}

// ─── end game ─────────────────────────────────────────────────────────────────

async function endGame(game, channel, _client, winner) {
  games.delete(game.channelId);
  game.phase = 'ended';
  const isVillage = winner === 'village';
  const roles = game.players.map(p =>
    `${game.dead.has(p.id) ? '💀' : '✅'} **${p.username}** — ${ROLES[p.role].emoji} ${ROLES[p.role].name}`
  ).join('\n');

  await channel.send({
    embeds: [new EmbedBuilder()
      .setColor(isVillage ? 0x57F287 : 0xED4245)
      .setTitle(isVillage ? '🏘️ Deegaanku Guuleystay!' : '🐺 Werewolves-ku Guuleysteen!')
      .setDescription(isVillage
        ? '🎉 Dhammaan Werewolves-kii waa la saarsay. Nabadu waa timid!'
        : '🔥 Werewolves-ku tiradoodu waxay la mid noqotay Villagers-ka. Xarunta way gubtay!')
      .addFields({ name: '📋 Doorarka oo dhan', value: roles })
      .setTimestamp()
    ],
  });
}

// ─── handle ───────────────────────────────────────────────────────────────────

async function handle(message, args, client) {
  const channelId = message.channel.id;
  const userId    = message.author.id;
  const username  = message.author.username;
  const sub       = args[0]?.toLowerCase();

  // Legacy text subcommands (fallback for non-button use)
  if (sub === 'stop' || sub === 'end') {
    const game = games.get(channelId);
    if (!game) return message.reply('❌ Ma jirto ciyaar.');
    if (game.hostId !== userId && !message.member?.permissions.has('ManageMessages'))
      return message.reply('❌ Kaliya host-ku ayaa joojin kara.');
    if (game.lobbyCollector) game.lobbyCollector.stop('stopped');
    games.delete(channelId);
    return message.reply('🛑 Ciyaarta Werewolf waa la joojiyay.');
  }

  if (sub === 'status') {
    const game = games.get(channelId);
    if (!game) return message.reply('❌ Ma jirto ciyaar firfircoon.');
    return message.reply({
      embeds: [new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`🐺 Werewolf — Xaaladda (Wareeg ${game.round || 0})`)
        .addFields(
          { name: '✅ Nool', value: getAlive(game).map(p => `• ${p.username}`).join('\n') || '—', inline: true },
          { name: '💀 Dhintay', value: [...(game.dead || [])].map(id => {
            const p = game.players.find(x => x.id === id);
            return p ? `• ${p.username} ${ROLES[p.role].emoji}` : '';
          }).filter(Boolean).join('\n') || '—', inline: true },
          { name: 'Xaaladda', value: `${game.phase === 'night' ? '🌙 Habeenka' : game.phase === 'day' ? '☀️ Maalinta' : '🏠 Lobby'}` },
        )
        .setTimestamp()
      ],
    });
  }

  // Open / join lobby  (?ww  or  ?ww join)
  if (!sub || sub === 'join') {
    let game = games.get(channelId);

    if (game && game.phase !== 'lobby') {
      return message.reply('⚠️ Ciyaartu horay u biloowday. Isticmaal `?ww status` si aad u aragto xaaladda.');
    }

    if (!game) {
      // Create new lobby
      game = {
        channelId,
        players: [],
        ready: new Set(),
        dead: new Set(),
        phase: 'lobby',
        round: 1,
        hostId: userId,
        hostUsername: username,
        nightActions: {},
        dayVotes: {},
        dayUserVotes: {},
        lobbyCollector: null,
      };
      games.set(channelId, game);
      game.players.push({ id: userId, username, role: null });

      // Delete command message to keep channel clean
      try { await message.delete(); } catch {}

      // Post video banner (Discord auto-embeds mp4 from CDN as a video player)
      await message.channel.send({ content: LOBBY_VIDEO });

      // Post lobby embed with buttons immediately after
      const lobbyMsg = await message.channel.send({
        embeds: [buildLobbyEmbed(game)],
        components: buildLobbyRows(channelId),
      });

      game.lobbyMsg = lobbyMsg;
      startLobbyCollector(lobbyMsg, game, client);
      return;
    }

    // Game exists and is in lobby phase — let them join via button, but also support text
    if (game.players.find(p => p.id === userId)) {
      return message.reply({ content: '⚠️ Waxaad horay ugu biirtay! Lobby-ga taabo si aad ugu biirto.', ephemeral: true }).catch(() => message.reply('⚠️ Waxaad horay ugu biirtay!'));
    }
    game.players.push({ id: userId, username, role: null });
    try { await message.delete(); } catch {}
    if (game.lobbyMsg) {
      await game.lobbyMsg.edit({ embeds: [buildLobbyEmbed(game)], components: buildLobbyRows(channelId) });
    }
    return;
  }

  if (sub === 'start') {
    const game = games.get(channelId);
    if (!game || game.phase !== 'lobby') return message.reply('❌ Ma jirto lobby furan.');
    if (game.hostId !== userId) return message.reply('❌ Kaliya host-ku ayaa bilaabin kara.');
    if (game.players.length < 4) return message.reply('❌ Waxaad u baahan tahay ugu yaraan **4 qof**.');
    if (game.lobbyCollector) game.lobbyCollector.stop('started');
    if (game.lobbyMsg) await game.lobbyMsg.edit({ components: [] }).catch(() => {});
    try { await message.delete(); } catch {}
    await launchGame(game, message.channel, client);
    return;
  }

  await message.reply('❓ Isticmaal: `?ww` (lobby fur), `?ww start`, `?ww status`, `?ww stop`');
}

module.exports = { handle };
