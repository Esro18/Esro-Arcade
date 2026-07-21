const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('game')
    .setDescription('تحكم بالألعاب')
    .addStringOption(option =>
      option.setName('action')
        .setDescription('start / stop / lock / unlock')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('name')
        .setDescription('اسم اللعبة لو اخترت start')
        .setRequired(false)
    ),

  async execute(interaction, games, gameState) {
    const action = interaction.options.getString('action');
    const name = interaction.options.getString('name');

    if (action === 'lock') {
      gameState.locked = true;
      return interaction.reply('🔒 تم قفل الألعاب');
    }

    if (action === 'unlock') {
      gameState.locked = false;
      return interaction.reply('🔓 تم فتح الألعاب');
    }

    if (action === 'stop') {
      gameState.current = null;
      return interaction.reply('🛑 تم إيقاف اللعبة');
    }

    if (action === 'start') {
      if (!name) return interaction.reply('❌ لازم تختار اسم اللعبة');

      const game = games[name];
      if (!game) return interaction.reply('❌ اللعبة غير موجودة');

      gameState.current = name;
      return interaction.reply(`🎮 تم تشغيل لعبة: **${name}**`);
    }
  }
};
