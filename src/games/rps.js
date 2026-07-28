const { EmbedBuilder } = require('discord.js');

const choices = ['rock', 'paper', 'scissors'];
const emojis = { rock: '🪨', paper: '📄', scissors: '✂️' };
const somali = { rock: 'Dhagax', paper: 'Warqad', scissors: 'Maqas' };

// wins[a] beats b
const beats = { rock: 'scissors', scissors: 'paper', paper: 'rock' };

async function handle(message, args) {
  const choice = args[0]?.toLowerCase();

  if (!choices.includes(choice)) {
    return message.reply(`❌ Fadlan dooro: \`?rps rock\`, \`?rps paper\`, ama \`?rps scissors\``);
  }

  const botChoice = choices[Math.floor(Math.random() * 3)];

  let result, color;
  if (choice === botChoice) {
    result = "🤝 Waa **dhamaadkii** (tie)! Laba xeelood oo isku mid ah.";
    color = 0xFEE75C;
  } else if (beats[choice] === botChoice) {
    result = `🏆 **${message.author.username}** ayaa guuleystay!`;
    color = 0x57F287;
  } else {
    result = `🤖 **Bot** ayaa guuleystay! Isku day mar kale.`;
    color = 0xED4245;
  }

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle('✂️ Rock Paper Scissors')
    .addFields(
      {
        name: `${message.author.username}`,
        value: `${emojis[choice]} ${somali[choice]}`,
        inline: true,
      },
      { name: 'VS', value: '⚔️', inline: true },
      {
        name: 'Bot',
        value: `${emojis[botChoice]} ${somali[botChoice]}`,
        inline: true,
      },
      { name: 'Natiijada', value: result }
    )
    .setFooter({ text: 'Rock wuxuu jebiyaa Scissors • Scissors wuxuu gooyaa Paper • Paper wuxuu daboolaa Rock' })
    .setTimestamp();

  await message.reply({ embeds: [embed] });
}

module.exports = { handle };
