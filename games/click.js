const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const points = require('../systems/points');
const cooldown = require('../systems/cooldown');
const config = require('../systems/gameconfig');

const chars = [
  { name: "باتمان", hint: "بطل خارق يحب الظلام." },
  { name: "سبونج بوب", hint: "يعيش في أناناس تحت البحر." },
  { name: "آيرون مان", hint: "ملياردير عبقري يلبس بدلة حديد." }
];

module.exports = {
  start(msg) {
    const c = chars[Math.floor(Math.random() * chars.length)];

    msg.reply({
      content: `🧠 خمن الشخصية:\nتلميح: ${c.hint}`,
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`char_show_${c.name}`)
            .setLabel('إظهار الإجابة')
            .setStyle(ButtonStyle.Secondary)
        )
      ]
    });
  },

  handle(i) {
    // كول داون
    if (cooldown.check(i.user.id, 'char', config.cooldown)) {
      return i.reply({ content: '⏳ انتظر قبل ما تلعب مرة ثانية.', ephemeral: true });
    }

    const name = i.customId.split("_")[2];

    // إضافة النقاط
    points.addPoints(i.user.id, config.points.char);

    return i.reply({
      content: `الشخصية هي: **${name}** (+${config.points.char} نقاط)`,
      ephemeral: true
    });
  }
};
