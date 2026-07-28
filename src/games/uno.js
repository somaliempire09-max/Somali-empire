const { EmbedBuilder } = require('discord.js');

// Active UNO games keyed by channelId
const games = new Map();

const COLORS = ['red', 'green', 'blue', 'yellow'];
const COLOR_EMOJI = { red: '🔴', green: '🟢', blue: '🔵', yellow: '🟡', wild: '🌈' };
const VALUES = ['0','1','2','3','4','5','6','7','8','9','skip','reverse','+2'];

function buildDeck() {
  const deck = [];
  for (const color of COLORS) {
    for (const val of VALUES) {
      deck.push({ color, val });
      if (val !== '0') deck.push({ color, val }); // two of each except 0
    }
  }
  // Wild cards
  for (let i = 0; i < 4; i++) {
    deck.push({ color: 'wild', val: 'wild' });
    deck.push({ color: 'wild', val: '+4' });
  }
  return deck;
}

function shuffle(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function cardStr(card) {
  const e = COLOR_EMOJI[card.color] || '🃏';
  return `${e}${card.val.toUpperCase()}`;
}

function canPlay(card, topCard, declaredColor) {
  const activeColor = declaredColor || topCard.color;
  if (card.color === 'wild') return true;
  if (card.color === activeColor) return true;
  if (card.val === topCard.val) return true;
  return false;
}

function parseCard(str, hand, topCard, declaredColor) {
  const s = str.toLowerCase().trim();
  // Support formats: red5, 5red, red+2, +4, wild
  let color = null, val = null;
  for (const c of COLORS) {
    if (s.startsWith(c)) { color = c; val = s.slice(c.length); break; }
    if (s.endsWith(c)) { color = c; val = s.slice(0, s.length - c.length); break; }
  }
  if (s === 'wild' || s === 'wild4' || s === '+4' || s === 'wild+4') {
    color = 'wild'; val = s === '+4' || s === 'wild4' || s === 'wild+4' ? '+4' : 'wild';
  }
  if (!color && !val) { val = s; }

  // Find matching card in hand
  return hand.find(c => {
    if (color && val) return c.color === color && c.val === val;
    if (color) return c.color === color;
    if (val) return c.val === val;
    return false;
  }) || null;
}

async function handle(message, args, client) {
  const channelId = message.channel.id;
  const userId = message.author.id;
  const username = message.author.username;
  const sub = args[0]?.toLowerCase();

  if (!sub || sub === 'join') {
    let game = games.get(channelId);
    if (!game) {
      game = {
        players: [],
        hands: {},
        deck: [],
        discard: [],
        currentTurn: 0,
        direction: 1,
        started: false,
        declaredColor: null,
        pendingDraw: 0,
      };
      games.set(channelId, game);
    }
    if (game.started) return message.reply('⚠️ Ciyaartu wey biloowday. Sugto kuwa dambe!');
    if (game.players.includes(userId)) return message.reply('⚠️ Waxaad horay ugu biirtay ciyaarta!');
    if (game.players.length >= 8) return message.reply('⚠️ Ciyaartu waa buuxday (8 qof)!');

    game.players.push(userId);
    game.hands[userId] = [];

    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle('🎮 UNO — Biirinta')
      .setDescription(`**${username}** ayaa ku biirtay ciyaarta UNO!\n\n👥 Ciyaartoyda: ${game.players.length}\n\n*Isticmaal \`?uno join\` si aad ku biirto, \`?uno start\` markay 2+ yihiin.*`)
      .setTimestamp();
    await message.reply({ embeds: [embed] });
    return;
  }

  if (sub === 'start') {
    const game = games.get(channelId);
    if (!game) return message.reply('❌ Ma jirto ciyaar. Isticmaal `?uno join` si aad bilaabdo.');
    if (game.started) return message.reply('⚠️ Ciyaartu horay u biloowday.');
    if (game.players[0] !== userId) return message.reply('❌ Kaliya qofkii ugu horeeyay ee ku biirtay ayaa bilaabi kara.');
    if (game.players.length < 2) return message.reply('❌ Waxaad u baahan tahay ugu yaraan 2 qof.');

    // Deal cards
    game.deck = shuffle(buildDeck());
    for (const pid of game.players) {
      game.hands[pid] = game.deck.splice(0, 7);
    }
    // First card (not wild)
    let first;
    do { first = game.deck.shift(); } while (first.color === 'wild');
    game.discard.push(first);
    game.started = true;

    const currentPlayer = game.players[game.currentTurn];
    const topCard = game.discard[game.discard.length - 1];

    const embed = new EmbedBuilder()
      .setColor(0xFEE75C)
      .setTitle('🎮 UNO — Ciyaartu Biloowday!')
      .setDescription(`Kaarkaaga waa la qaybiyay!\n\n**Kaarkaas ugu sarreeya:** ${cardStr(topCard)}\n\n**Jeerkaaga:** <@${currentPlayer}>\n\n📩 Isticmaal \`?uno hand\` si aad u aragto kaararkaaga.`)
      .setTimestamp();
    await message.reply({ embeds: [embed] });
    return;
  }

  if (sub === 'hand') {
    const game = games.get(channelId);
    if (!game || !game.started) return message.reply('❌ Ma jirto ciyaar firfircoon.');
    if (!game.players.includes(userId)) return message.reply('❌ Maaha ciyaartada.');

    const hand = game.hands[userId];
    const handDisplay = hand.map(cardStr).join('  ');
    try {
      await message.author.send(`🃏 **Kaararkaaga UNO:**\n${handDisplay}\n\n*Isticmaal \`?uno play <kaar>\` si aad u ciyaarto. Tusaale: \`?uno play red5\` ama \`?uno play wild\`*`);
      await message.reply('📩 Kaararkaaga waa laguu diray DM!');
    } catch {
      await message.reply(`🃏 Kaararkaaga: ${handDisplay}`);
    }
    return;
  }

  if (sub === 'status') {
    const game = games.get(channelId);
    if (!game) return message.reply('❌ Ma jirto ciyaar.');
    if (!game.started) return message.reply('⏳ Ciyaartu ma biloowdin. Sugaya ciyaartoyda.');

    const topCard = game.discard[game.discard.length - 1];
    const currentPlayer = game.players[game.currentTurn];
    const playerList = game.players.map((pid, i) => {
      const arrow = i === game.currentTurn ? '👉' : '  ';
      return `${arrow} <@${pid}> — ${game.hands[pid].length} kaar`;
    }).join('\n');

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🎮 UNO — Xaaladda')
      .addFields(
        { name: 'Kaarkaas ugu sarreeya', value: cardStr(topCard) + (game.declaredColor ? ` (Midabka: ${COLOR_EMOJI[game.declaredColor]}${game.declaredColor})` : '') },
        { name: 'Ciyaartoyda', value: playerList },
        { name: 'Jeerka', value: `<@${currentPlayer}>` },
      )
      .setTimestamp();
    await message.reply({ embeds: [embed] });
    return;
  }

  if (sub === 'play') {
    const game = games.get(channelId);
    if (!game || !game.started) return message.reply('❌ Ma jirto ciyaar firfircoon.');
    if (!game.players.includes(userId)) return message.reply('❌ Maaha ciyaartada.');
    if (game.players[game.currentTurn] !== userId) return message.reply('⏳ Maaha jeerkaaga. Sug!');

    const cardInput = args.slice(1).join('').toLowerCase();
    if (!cardInput) return message.reply('❌ Ku dar kaarkaaga. Tusaale: `?uno play red5` ama `?uno play wild`');

    // Handle wild color declaration: ?uno play wild red
    let wildColor = null;
    if ((cardInput.startsWith('wild') || cardInput === '+4') && args[2]) {
      wildColor = args[2].toLowerCase();
      if (!COLORS.includes(wildColor)) wildColor = null;
    }

    const topCard = game.discard[game.discard.length - 1];
    const hand = game.hands[userId];
    const card = parseCard(cardInput, hand, topCard, game.declaredColor);

    if (!card) return message.reply(`❌ Kaarahaas laguma helin gacantaada. Isticmaal \`?uno hand\` si aad u aragto kaararkaaga.`);
    if (!canPlay(card, topCard, game.declaredColor)) return message.reply(`❌ Kaarkaan ma ciyaari kartid. Midabka ama qiimaha waa inuu ku waafaqo ${cardStr(topCard)}.`);

    // Remove from hand
    const idx = hand.indexOf(card);
    hand.splice(idx, 1);
    game.discard.push(card);
    game.declaredColor = null;

    // Check UNO / win
    if (hand.length === 0) {
      games.delete(channelId);
      const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('🏆 UNO — Guul!')
        .setDescription(`🎉 **${username}** ayaa guuleystay ciyaarta UNO!\n\nUNO! UNO! UNO! 🥳`)
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    if (hand.length === 1) {
      await message.channel.send(`⚠️ **UNO!** <@${userId}> wuxuu leeyahay hal kaar kaliya!`);
    }

    // Apply card effects
    let nextTurn = game.currentTurn;
    let skipNext = false;

    if (card.val === 'reverse') {
      game.direction *= -1;
      if (game.players.length === 2) skipNext = true;
    }

    if (card.val === 'skip') skipNext = true;

    if (card.val === '+2') {
      game.pendingDraw += 2;
      skipNext = true;
    }

    if (card.val === '+4') {
      game.pendingDraw += 4;
      skipNext = true;
      game.declaredColor = wildColor || COLORS[Math.floor(Math.random() * 4)];
    }

    if (card.color === 'wild' && card.val === 'wild') {
      game.declaredColor = wildColor || COLORS[Math.floor(Math.random() * 4)];
    }

    // Advance turn
    nextTurn = (game.currentTurn + game.direction + game.players.length) % game.players.length;
    if (skipNext) nextTurn = (nextTurn + game.direction + game.players.length) % game.players.length;
    game.currentTurn = nextTurn;

    const nextPlayer = game.players[game.currentTurn];
    const colorNote = game.declaredColor ? ` | Midabka cusub: ${COLOR_EMOJI[game.declaredColor]}${game.declaredColor}` : '';

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🎮 UNO — Kaar la ciyaaray')
      .setDescription(`**${username}** wuxuu ciyaaray ${cardStr(card)}${colorNote}\n\nKaarar remaining: **${hand.length}**\n\n**Jeerka:** <@${nextPlayer}>`)
      .setTimestamp();
    await message.reply({ embeds: [embed] });

    // Force draw for next player if pending
    if (game.pendingDraw > 0 && skipNext) {
      const victim = game.players[(game.currentTurn)];
      const drawCount = game.pendingDraw;
      game.pendingDraw = 0;
      for (let i = 0; i < drawCount; i++) {
        if (game.deck.length === 0) game.deck = shuffle(game.discard.splice(0, game.discard.length - 1));
        game.hands[victim].push(game.deck.shift());
      }
      await message.channel.send(`📥 <@${victim}> wuxuu qaaday **${drawCount}** kaar!`);
    }
    return;
  }

  if (sub === 'draw') {
    const game = games.get(channelId);
    if (!game || !game.started) return message.reply('❌ Ma jirto ciyaar firfircoon.');
    if (!game.players.includes(userId)) return message.reply('❌ Maaha ciyaartada.');
    if (game.players[game.currentTurn] !== userId) return message.reply('⏳ Maaha jeerkaaga!');

    if (game.deck.length === 0) game.deck = shuffle(game.discard.splice(0, game.discard.length - 1));
    const drawn = game.deck.shift();
    game.hands[userId].push(drawn);

    // Advance turn
    game.currentTurn = (game.currentTurn + game.direction + game.players.length) % game.players.length;
    const nextPlayer = game.players[game.currentTurn];

    try {
      await message.author.send(`📥 Waxaad qaadatay: ${cardStr(drawn)}`);
    } catch {}
    const embed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle('🎮 UNO — Kaar la qaaday')
      .setDescription(`**${username}** wuxuu qaatay kaar.\n\n**Jeerka:** <@${nextPlayer}>`)
      .setTimestamp();
    await message.reply({ embeds: [embed] });
    return;
  }

  if (sub === 'stop' || sub === 'end') {
    const game = games.get(channelId);
    if (!game) return message.reply('❌ Ma jirto ciyaar.');
    if (game.players[0] !== userId && !message.member?.permissions.has('ManageMessages')) {
      return message.reply('❌ Kaliya qofkii ugu horeeyay ama admin ayaa joojin kara.');
    }
    games.delete(channelId);
    return message.reply('🛑 Ciyaarta UNO waa la joojiyay.');
  }

  await message.reply('❓ Amarkaas la garanaayo ma aha. Isticmaal `?commands` si aad u aragto amarrada UNO.');
}

module.exports = { handle };
