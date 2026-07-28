const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

// Active poker games keyed by userId
const activeGames = new Map();

const SUITS = ['♠️', '♥️', '♦️', '♣️'];
const VALUES = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const VALUE_RANK = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14 };

function buildDeck() {
  const deck = [];
  for (const suit of SUITS) for (const val of VALUES) deck.push({ suit, val });
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
  return `${card.val}${card.suit}`;
}

function handStr(hand) {
  return hand.map(cardStr).join('  ');
}

function rankHand(hand) {
  const vals = hand.map(c => VALUE_RANK[c.val]).sort((a, b) => a - b);
  const suits = hand.map(c => c.suit);
  const valCounts = {};
  for (const v of vals) valCounts[v] = (valCounts[v] || 0) + 1;
  const counts = Object.values(valCounts).sort((a, b) => b - a);
  const isFlush = suits.every(s => s === suits[0]);
  const isStraight = vals[4] - vals[0] === 4 && new Set(vals).size === 5;
  const isRoyalStraight = isStraight && vals[0] === 10;

  if (isFlush && isRoyalStraight) return { rank: 9, name: '👑 Royal Flush' };
  if (isFlush && isStraight) return { rank: 8, name: '🎯 Straight Flush' };
  if (counts[0] === 4) return { rank: 7, name: '🃏 Four of a Kind' };
  if (counts[0] === 3 && counts[1] === 2) return { rank: 6, name: '🏠 Full House' };
  if (isFlush) return { rank: 5, name: '🌊 Flush' };
  if (isStraight) return { rank: 4, name: '➡️ Straight' };
  if (counts[0] === 3) return { rank: 3, name: '🎪 Three of a Kind' };
  if (counts[0] === 2 && counts[1] === 2) return { rank: 2, name: '👥 Two Pair' };
  if (counts[0] === 2) return { rank: 1, name: '✌️ One Pair' };
  return { rank: 0, name: `🃏 High Card (${VALUES[vals[4] - 2]})` };
}

function dealerHand(deck, count) {
  return deck.splice(0, count);
}

async function handle(message, args) {
  const userId = message.author.id;
  const sub = args[0]?.toLowerCase();

  // Start a new game
  if (!sub || sub === 'start') {
    if (activeGames.has(userId)) {
      return message.reply('⚠️ Waxaad hore u jirtaa ciyaarta. Isticmaal `?poker fold` si aad u baxdo.');
    }

    const deck = shuffle(buildDeck());
    const playerHand = dealerHand(deck, 5);
    const dealerCards = dealerHand(deck, 5);
    const game = { deck, playerHand, dealerCards, replaced: false };
    activeGames.set(userId, game);

    const ranking = rankHand(playerHand);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`poker_hit_${userId}`).setLabel('🔄 Beddel Kaar').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`poker_stand_${userId}`).setLabel('✋ Stand').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`poker_fold_${userId}`).setLabel('🏳️ Fold').setStyle(ButtonStyle.Danger),
    );

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🃏 Poker — 5-Card Draw')
      .setDescription(`**${message.author.username}** gacantaada:\n\`${handStr(playerHand)}\``)
      .addFields({ name: 'Gacantaada', value: ranking.name })
      .setFooter({ text: 'Dooro: Beddel kaar (1 mar), Stand, ama Fold' })
      .setTimestamp();

    const reply = await message.reply({ embeds: [embed], components: [row] });

    // Button collector
    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000,
      filter: i => i.customId.endsWith(`_${userId}`) && i.user.id === userId,
    });

    collector.on('collect', async (interaction) => {
      await interaction.deferUpdate();
      const g = activeGames.get(userId);
      if (!g) return;

      const action = interaction.customId.split('_')[1];

      if (action === 'fold') {
        activeGames.delete(userId);
        collector.stop('fold');
        const foldEmbed = new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle('🃏 Poker — Fold')
          .setDescription(`${message.author.username} wuu ka baxay ciyaarta. 🏳️`)
          .setTimestamp();
        await reply.edit({ embeds: [foldEmbed], components: [] });
        return;
      }

      if (action === 'hit') {
        if (g.replaced) {
          await interaction.followUp({ content: '⚠️ Hal mar ayaad bedeli kartaa kaararkaaga!', ephemeral: true });
          return;
        }
        // Replace 1 random card
        const idx = Math.floor(Math.random() * 5);
        g.playerHand[idx] = g.deck.splice(0, 1)[0];
        g.replaced = true;
        const newRanking = rankHand(g.playerHand);
        const hitEmbed = new EmbedBuilder()
          .setColor(0xFEE75C)
          .setTitle('🃏 Poker — Kaar cusub')
          .setDescription(`Kaar ${idx + 1} ayaa la bedelay.\n**Gacantaada hadda:**\n\`${handStr(g.playerHand)}\``)
          .addFields({ name: 'Gacantaada', value: newRanking.name })
          .setFooter({ text: 'Stand si aad u aragto natiijada, ama Fold si aad u baxdo' })
          .setTimestamp();

        const newRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`poker_hit_${userId}`).setLabel('🔄 Beddel Kaar').setStyle(ButtonStyle.Primary).setDisabled(true),
          new ButtonBuilder().setCustomId(`poker_stand_${userId}`).setLabel('✋ Stand').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`poker_fold_${userId}`).setLabel('🏳️ Fold').setStyle(ButtonStyle.Danger),
        );
        await reply.edit({ embeds: [hitEmbed], components: [newRow] });
        return;
      }

      if (action === 'stand') {
        const g2 = activeGames.get(userId);
        activeGames.delete(userId);
        collector.stop('stand');

        const playerRank = rankHand(g2.playerHand);
        const dealerRank = rankHand(g2.dealerCards);

        let resultText, color;
        if (playerRank.rank > dealerRank.rank) {
          resultText = `🏆 **${message.author.username}** ayaa guuleystay!`;
          color = 0x57F287;
        } else if (dealerRank.rank > playerRank.rank) {
          resultText = `🤖 **Dealer** ayaa guuleystay!`;
          color = 0xED4245;
        } else {
          resultText = `🤝 **Tie** — dhamaadkii!`;
          color = 0xFEE75C;
        }

        const finalEmbed = new EmbedBuilder()
          .setColor(color)
          .setTitle('🃏 Poker — Natiijada')
          .addFields(
            { name: `${message.author.username}`, value: `\`${handStr(g2.playerHand)}\`\n${playerRank.name}`, inline: true },
            { name: 'VS', value: '⚔️', inline: true },
            { name: 'Dealer', value: `\`${handStr(g2.dealerCards)}\`\n${dealerRank.name}`, inline: true },
            { name: 'Natiijada', value: resultText },
          )
          .setTimestamp();
        await reply.edit({ embeds: [finalEmbed], components: [] });
      }
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time') {
        activeGames.delete(userId);
        reply.edit({ components: [] }).catch(() => {});
      }
    });

    return;
  }

  // Shortcut subcommands (for typed use)
  if (sub === 'fold') {
    if (!activeGames.has(userId)) return message.reply('❌ Ma jirto ciyaar firfircoon. Isticmaal `?poker` si aad u bilowdo.');
    activeGames.delete(userId);
    return message.reply('🏳️ Waxaad ka baxday ciyaarta Poker.');
  }

  return message.reply('ℹ️ Isticmaal `?poker` si aad u bilowdo. Kadibna isticmaal badhanka si aad u ciyaarto.');
}

module.exports = { handle };
