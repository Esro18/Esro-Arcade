const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const points = require('../systems/points');
const cooldown = require('../systems/cooldown');
const config = require('../systems/gameconfig');

const words = ["برمجة", "ديسكورد", "مافيا"];

module.exports = {
  start(msg) {
    const w = words[Math.floor(Math.random() * words.length)];
    const missingIndex = Math.floor(Math.random() * w.length);
    const display = w.slice(0, missingIndex) + "_" + w.slice(missingIndex + 1);

    msg.reply({
      content: `🔤 أكمل الكلمة:\n${display}`,
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`missing_show_${w}`)
            .setLabel('إظهار الكلمة')
            .setStyle(ButtonStyle.Secondary)
        )
      ]
    });
  },

  handle(i) {
    // كول داون
    if (cooldown.check(i.user.id, 'missing', config.cooldown)) {
      return i.reply({ content: '⏳ انتظر قبل ما تلعب مرة ثانية.', ephemeral: true });
    }

    const w = i.customId.split("_")[2];

    // إضافة النقاط
    points.addPoints(i.user.id, config.points.missing);

    return i.reply({
      content: `الكلمة هي: **${w}** (+${config.points.missing} نقاط)`,
      ephemeral: true
    });
  }
};
