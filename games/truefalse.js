const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require('discord.js');

const points = require('../systems/points');
const cooldown = require('../systems/cooldown');
const config = require('../systems/gameconfig');

// أسئلة صح ولا خطأ عشوائية
const questions = [
  { q: "الحديد يطفو فوق الماء.", a: false },
  { q: "القمر يعكس ضوء الشمس.", a: true },
  { q: "الزرافة أقصر من القط.", a: false },
  { q: "الصين أكبر دولة في العالم.", a: false },
  { q: "الذهب معدن.", a: true },
  { q: "السمك يتنفس الهواء.", a: false },
  { q: "الإنسان عنده قلبين.", a: false },
  { q: "النار تحتاج أكسجين.", a: true },
  { q: "الثلج حار.", a: false },
  { q: "الضوء أسرع من الصوت.", a: true },
  { q: "القطط تطير.", a: false },
  { q: "الدم لونه أحمر.", a: true },
  { q: "الورق مصنوع من الخشب.", a: true },
  { q: "الإنسان يعيش بدون ماء.", a: false },
  { q: "الأسد يسمى ملك الغابة.", a: true },
  { q: "الطائرة أسرع من السيارة.", a: true },
  { q: "التمساح يعيش في الصحراء.", a: false },
  { q: "البرتقال لونه برتقالي.", a: true },
  { q: "السماء خضراء.", a: false },
  { q: "الإنترنت اختراع حديث.", a: true }
];

module.exports = {
  start(msg) {
    // سؤال عشوائي
    const q = questions[Math.floor(Math.random() * questions.length)];

    const embed = new EmbedBuilder()
      .setTitle("❓ صح ولا خطأ")
      .setDescription(q.q)
      .setColor(0x00aeff);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`tf_${q.a ? 'correct' : 'wrong'}_true`)
        .setLabel("صح")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId(`tf_${!q.a ? 'correct' : 'wrong'}_false`)
        .setLabel("خطأ")
        .setStyle(ButtonStyle.Danger)
    );

    msg.reply({
      embeds: [embed],
      components: [row]
    });
  },

  async handle(i) {
    // كول داون
    if (cooldown.check(i.user.id, 'truefalse', config.cooldown)) {
      return i.reply({ content: '⏳ انتظر شوي.', ephemeral: true });
    }

    const isCorrect = i.customId.includes("correct");

    // تعطيل الأزرار بعد أول ضغط
    const row = ActionRowBuilder.from(i.message.components[0]);
    row.components.forEach(btn => btn.setDisabled(true));
    await i.update({ components: [row] });

    // صلاحية الأدمن
    const isAdmin = i.member.roles.cache.some(r => r.name === "Admin Games");

    // إذا الإجابة صحيحة
    if (isCorrect) {
      points.addPoints(i.user.id, config.points.truefalse);
      return i.followUp({
        content: `🔥 إجابة صحيحة! +${config.points.truefalse}`,
        ephemeral: false
      });
    }

    // إذا اللاعب عادي → ما يشوف الإجابة الصحيحة
    if (!isAdmin) {
      return i.followUp({
        content: "❌ خطأ!",
        ephemeral: false
      });
    }

    // إذا أدمن → يظهر الإجابة الصحيحة
    const qText = i.message.embeds[0]?.data?.description;
    const correctObj = questions.find(q => q.q === qText);

    return i.followUp({
      content: `❌ خطأ!\n✅ الإجابة الصحيحة: **${correctObj.a ? "صح" : "خطأ"}**`,
      ephemeral: false
    });
  }
};
