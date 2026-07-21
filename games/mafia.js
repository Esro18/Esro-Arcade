const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const points = require('../systems/points');
const cooldown = require('../systems/cooldown');
const config = require('../systems/gameconfig');

let game = {
  players: new Set(),
  started: false
};

module.exports = {
  start(msg) {
    game.players.clear();
    game.started = false;

    const embed = new EmbedBuilder()
      .setTitle("🎭 لعبة المافيا")
      .setDescription("اضغط زر **انضمام** للدخول.\nلما يكتمل العدد اضغط **بدء اللعبة**.")
      .setColor(0x8b0000);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('mafia_join').setLabel('انضمام').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('mafia_start').setLabel('بدء اللعبة').setStyle(ButtonStyle.Danger)
    );

    msg.reply({ embeds: [embed], components: [row] });
  },

  handle(i) {
    // كول داون
    if (cooldown.check(i.user.id, 'mafia', config.cooldown)) {
      return i.reply({ content: '⏳ انتظر قبل ما تلعب مرة ثانية.', ephemeral: true });
    }

    // زر الانضمام
    if (i.customId === 'mafia_join') {
      game.players.add(i.user.id);
      return i.reply({
        content: `انضم ${i.user}! عدد اللاعبين الآن: ${game.players.size}`,
        ephemeral: true
      });
    }

    // زر بدء اللعبة
    if (i.customId === 'mafia_start') {
      if (game.players.size < 3) {
        return i.reply({ content: "تحتاج 3 لاعبين على الأقل.", ephemeral: true });
      }

      game.started = true;

      const roles = ["مافيا", "دكتور", "مواطن", "مواطن", "مواطن"];
      const shuffled = [...game.players].sort(() => Math.random() - 0.5);

      let result = "";
      shuffled.forEach((id, idx) => {
        result += `<@${id}> → **${roles[idx] || "مواطن"}**\n`;
      });

      const mafiaId = shuffled[0];

      // إضافة نقاط للمافيا
      points.addPoints(mafiaId, config.points.mafia);

      return i.update({
        embeds: [
          new EmbedBuilder()
            .setTitle("🎭 توزيع الأدوار")
            .setDescription(
              result +
              `\n🔥 المافيا (<@${mafiaId}>) حصل على +${config.points.mafia} نقطة`
            )
            .setColor(0x00ffff)
        ],
        components: []
      });
    }
  }
};
