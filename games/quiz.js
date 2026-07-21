const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const points = require('../systems/points');
const cooldown = require('../systems/cooldown');
const config = require('../systems/gameconfig');

const questions = [
  {
    q: "ما هي عاصمة السعودية؟",
    options: ["جدة", "الرياض", "مكة"],
    correct: "الرياض"
  }
];

module.exports = {
  start(msg) {
    const q = questions[Math.floor(Math.random() * questions.length)];

    msg.reply({
      content: `📚 سؤال عام:\n${q.q}`,
      components: [
        new ActionRowBuilder().addComponents(
          ...q.options.map((opt) =>
            new ButtonBuilder()
              .setCustomId(`quiz_${opt === q.correct ? 'correct' : 'wrong'}`)
              .setLabel(opt)
              .setStyle(ButtonStyle.Primary)
          )
        )
      ]
    });
  },

  handle(i) {
    // كول داون
    if (cooldown.check(i.user.id, 'quiz', config.cooldown)) {
      return i.reply({ content: '⏳ انتظر قبل ما تلعب مرة ثانية.', ephemeral: true });
    }

    const isCorrect = i.customId === 'quiz_correct';

    if (isCorrect) {
      points.addPoints(i.user.id, config.points.quiz);
      return i.reply({ content: `🔥 إجابة صحيحة! +${config.points.quiz} نقاط`, ephemeral: true });
    }

    return i.reply({ content: "❌ خطأ!", ephemeral: true });
  }
};
