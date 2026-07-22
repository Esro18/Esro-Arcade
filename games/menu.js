const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder
} = require('discord.js');

module.exports = {
  start(msg) {
    const embed = new EmbedBuilder()
      .setTitle("🎮 قائمة الألعاب")
      .setDescription("اختر اللعبة اللي تبغاها من القائمة تحت")
      .setColor(0x00aeff)
      .setThumbnail(msg.client.user.displayAvatarURL());

    const menu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('games_menu')
        .setPlaceholder('اختر لعبة…')
        .addOptions([
          { label: 'مافيا', value: 'mafia' },
          { label: 'ألغاز (كتابة)', value: 'riddle' },
          { label: 'صح ولا خطأ', value: 'truefalse' },
          { label: 'علم الدولة', value: 'flags' },
          { label: 'تخمين شخصية', value: 'char' },
          { label: 'حجر ورقة مقص', value: 'rps' },
          { label: 'أسرع واحد يضغط', value: 'click' },
          { label: 'الكلمة المفقودة', value: 'missing' },
          { label: 'أسئلة عامة', value: 'quiz' }
        ])
    );

    msg.reply({ embeds: [embed], components: [menu] });
  },

  handle(i, games) {
    const game = games[i.values[0]];
    if (!game) return;
    return game.start(i);
  }
};
