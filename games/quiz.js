const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require('discord.js');

const points = require('../systems/points');
const cooldown = require('../systems/cooldown');
const config = require('../systems/gameconfig');

// مجموعة أسئلة عشوائية
const questions = [
  {
    q: "ما هي عاصمة السعودية؟",
    options: ["جدة", "الرياض", "مكة"],
    correct: "الرياض"
  },
  {
    q: "من هو مخترع المصباح الكهربائي؟",
    options: ["توماس إديسون", "نيوتن", "أينشتاين"],
    correct: "توماس إديسون"
  },
  {
    q: "كم عدد الكواكب في المجموعة الشمسية؟",
    options: ["7", "8", "9"],
    correct: "8"
  },
  {
    q: "ما هو أكبر محيط في العالم؟",
    options: ["الأطلسي", "الهادي", "الهندي"],
    correct: "الهادي"
  },
  {
    q: "من أول من صعد إلى القمر؟",
    options: ["نيل أرمسترونغ", "يوري غاغارين", "إدوين ألدرين"],
    correct: "نيل أرمسترونغ"
  }
];

module.exports = {
  start(msg) {
    // سؤال عشوائي
    const q = questions[Math.floor(Math.random() * questions.length)];

    const embed = new EmbedBuilder()
      .setTitle("📚 سؤال عام")
      .setDescription(q.q)
      .setColor(0x00aeff);

    const row = new ActionRowBuilder().addComponents(
      ...q.options.map(opt =>
        new ButtonBuilder()
          .setCustomId(`quiz_${opt === q.correct ? 'correct' : 'wrong'}`)
          .setLabel(opt)
          .setStyle(ButtonStyle.Primary)
      )
    );

    msg.reply({
      embeds: [embed],
      components: [row]
    });
  },

  async handle(i) {

    // منع التعليق
    await i.deferReply({ ephemeral: true }).catch(() => {});

    // كول داون
    if (cooldown.check(i.user.id, 'quiz', config.cooldown)) {
      return i.editReply({ content: '⏳ انتظر قبل ما تلعب مرة ثانية.' });
    }

    const isCorrect = i.customId === 'quiz_correct';

    // تعطيل الأزرار بعد أول اختيار
    const row = ActionRowBuilder.from(i.message.components[0]);
    row.components.forEach(btn => btn.setDisabled(true));
    await i.update({ components: [row] });

    // صلاحية إظهار الإجابة
    const isAdmin = i.member.roles.cache.some(r => r.name === "Admin Games");

    if (isCorrect) {
      points.addPoints(i.user.id, config.points.quiz);
      return i.followUp({
        content: `🔥 إجابة صحيحة! +${config.points.quiz} نقاط`,
        ephemeral: false
      });
    }

    // إذا كان عنده رتبة الأدمن، يقدر يشوف الإجابة الصحيحة
    if (isAdmin) {
      const qText = i.message.embeds[0]?.data?.description || "السؤال غير معروف";
      const correctAnswer = questions.find(q => q.q === qText)?.correct || "غير محددة";
      return i.followUp({
        content: `❌ إجابة خاطئة!\n✅ الإجابة الصحيحة: **${correctAnswer}**`,
        ephemeral: false
      });
    }

    return i.followUp({
      content: "❌ إجابة خاطئة!",
      ephemeral: false
    });
  }
};
