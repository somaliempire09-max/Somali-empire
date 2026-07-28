const { EmbedBuilder } = require('discord.js');

async function handle(message, args) {
  const roll = () => Math.floor(Math.random() * 6) + 1;
  const faces = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

  const opponent = message.mentions.users.first();

  if (opponent && opponent.id !== message.author.id && !opponent.bot) {
    // vs another player
    const myRoll = roll();
    const theirRoll = roll();
    const myFace = faces[myRoll - 1];
    const theirFace = faces[theirRoll - 1];

    let result, color;
    if (myRoll > theirRoll) {
      result = `🏆 **${message.author.username}** ayaa guuleystay!`;
      color = 0x57F287;
    } else if (theirRoll > myRoll) {
      result = `🏆 **${opponent.username}** ayaa guuleystay!`;
      color = 0xED4245;
    } else {
      result = `🤝 Waa **dhamaadkii** (tie)!`;
      color = 0xFEE75C;
    }

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle('🎲 Dice Roll — Tartanka')
      .addFields(
        { name: `${message.author.username}`, value: `${myFace} **${myRoll}**`, inline: true },
        { name: 'VS', value: '⚔️', inline: true },
        { name: `${opponent.username}`, value: `${theirFace} **${theirRoll}**`, inline: true },
        { name: 'Natiijada', value: result }
      )
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  } else {
    // solo roll
    const myRoll = roll();
    const face = faces[myRoll - 1];

    let comment;
    if (myRoll === 6) comment = '🔥 Xasuusin! Waa ugu sarreyn!';
    else if (myRoll === 1) comment = '😬 Ugu xun! Isku day mar kale.';
    else comment = `Natiijadaadu waa **${myRoll}**.`;

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🎲 Dice Roll')
      .setDescription(`${message.author.username} wuxuu rogay laadhuu...`)
      .addFields({ name: 'Natiijada', value: `${face} **${myRoll}** — ${comment}` })
      .setFooter({ text: 'Isticmaal ?dice @qof si aad la tartamto!' })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
}

module.exports = { handle };
