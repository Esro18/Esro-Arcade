const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require('discord.js');

const points = require('../systems/points');
const cooldown = require('../systems/cooldown');
const config = require('../systems/gameconfig');

// أعلام بصور حقيقية
const flags = [
  { country: "السعودية", image: "https://flagcdn.com/w320/sa.png" },
  { country: "مصر", image: "https://flagcdn.com/w320/eg.png" },
  { country: "تركيا", image: "https://flagcdn.com/w320/tr.png" },
  { country: "الإمارات", image: "https://flagcdn.com/w320/ae.png" },
  { country: "قطر", image: "https://flagcdn.com/w320/qa.png" },
  { country: "الكويت", image: "https://flagcdn.com/w320/kw.png" },
  { country: "البحرين", image: "https://flagcdn.com/w320/bh.png" },
  { country: "عمان", image: "https://flagcdn.com/w320/om.png" },
  { country: "الأردن", image: "https://flagcdn.com/w320/jo.png" },
  { country: "العراق", image: "https://flagcdn.com/w320/iq.png" },
  { country: "لبنان", image: "https://flagcdn.com/w320/lb.png" },
  { country: "سوريا", image: "https://flagcdn.com/w320/sy.png" }
];

module.exports = {
  start(msg) {
    // علم عشوائي
    const f = flags[Math.floor(Math.random() * flags.length)];

    // 3 خيارات عشوائية
    const options = [...flags]
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    // نتأكد إن الخيار الصحيح موجود
    if (!options.find(o => o.country === f.country)) {
      options[0] = f;
    }

    const embed = new EmbedBuilder()
      .setTitle("🚩 ما هي الدولة لهذا العلم؟")
      .setImage(f.image)
      .setColor(0x00aeff);

    const row = new ActionRowBuilder().addComponents(
      ...options.map(opt =>
        new ButtonBuilder()
          .setCustomId(`flag_${opt.country === f.country ? 'correct' : 'wrong'}`)
          .setLabel(opt.country)
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
  return i.editReply({ content: 'اللعبة بدأت بالفعل.' });

    // كول داون
    if (cooldown.check(i.user.id, 'flags', config.cooldown)) {
      return i.editReply({ content: '⏳ انتظر قبل ما تلعب مرة ثانية.' });
    }

    const isCorrect = i.customId === 'flag_correct';

    // تعطيل الأزرار بعد أول اختيار
    const row = ActionRowBuilder.from(i.message.components[0]);
    row.components.forEach(btn => btn.setDisabled(true));

    await i.update({ components: [row] });

    // رد عام للجميع
    if (isCorrect) {
      points.addPoints(i.user.id, config.points.flags);
      return i.followUp({
        content: `🔥 إجابة صحيحة! +${config.points.flags} نقاط`,
        ephemeral: false
      });
    }

    return i.followUp({
      content: "❌ إجابة خاطئة!",
      ephemeral: false
    });
  }
};
