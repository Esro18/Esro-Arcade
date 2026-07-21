const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const points = require('../systems/points');
const cooldown = require('../systems/cooldown');
const config = require('../systems/gameconfig');

const flags = [
  { country: "السعودية", emoji: "🇸🇦" },
  { country: "مصر", emoji: "🇪🇬" },
  { country: "تركيا", emoji: "🇹🇷" }
];

module.exports = {
  start(msg) {
    const f = flags[Math.floor(Math.random() * flags.length)];

    // نختار 3 خيارات عشوائية
    const options = [...flags].sort(() => Math.random() - 0.5).slice(0, 3);

    // نتأكد إن الخيار الصحيح موجود بينهم
    if (!options.includes(f)) options[0] = f;

    msg.reply({
      content: `🚩 ما هي الدولة لهذا العلم: ${f.emoji} ؟`,
      components: [
        new ActionRowBuilder().addComponents(
          ...options.map((opt) =>
            new ButtonBuilder()
              .setCustomId(`flag_${opt.country === f.country ? 'correct' : 'wrong'}`)
              .setLabel(opt.country)
              .setStyle(ButtonStyle.Primary)
          )
        )
      ]
    });
  },

  handle(i) {
    // كول داون
    if (cooldown.check(i.user.id, 'flags', config.cooldown)) {
      return i.reply({ content: '⏳ انتظر قبل ما تلعب مرة ثانية.', ephemeral: true });
    }

    const isCorrect = i.customId === 'flag_correct';

    if (isCorrect) {
      points.addPoints(i.user.id, config.points.flags);
      return i.reply({
        content: `🔥 إجابة صحيحة! +${config.points.flags} نقاط`,
        ephemeral: true
      });
    }

    return i.reply({ content: "❌ خطأ!", ephemeral: true });
  }
};
