const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require('discord.js');

const points = require('../systems/points');
const cooldown = require('../systems/cooldown');
const config = require('../systems/gameconfig');

// شخصيات عشوائية
const chars = [
  { name: "باتمان", hint: "بطل خارق يحب الظلام." },
  { name: "سبونج بوب", hint: "يعيش في أناناس تحت البحر." },
  { name: "آيرون مان", hint: "ملياردير عبقري يلبس بدلة حديد." },
  { name: "غوكو", hint: "مقاتل ساياني قوي جداً." },
  { name: "ناروتو", hint: "نينجا يحلم أن يصبح الهوكاجي." },
  { name: "مايك وازوسكي", hint: "وحش أخضر بعين وحدة." }
];

module.exports = {
  start(msg) {
    // شخصية عشوائية
    const c = chars[Math.floor(Math.random() * chars.length)];

    const embed = new EmbedBuilder()
      .setTitle("🧠 خمن الشخصية")
      .setDescription(`تلميح: ${c.hint}`)
      .setColor(0x00aeff);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`char_show_${c.name}`)
        .setLabel('إظهار الإجابة')
        .setStyle(ButtonStyle.Secondary)
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
    if (cooldown.check(i.user.id, 'char', config.cooldown)) {
      return i.editReply({ content: '⏳ انتظر قبل ما تلعب مرة ثانية.' });
    }

    // استخراج اسم الشخصية
    const name = i.customId.split("_")[2];

    // تعطيل الزر بعد الضغط
    const row = ActionRowBuilder.from(i.message.components[0]);
    row.components.forEach(btn => btn.setDisabled(true));
    await i.update({ components: [row] });

    // التحقق من رتبة الأدمن
    const isAdmin = i.member.roles.cache.some(r => r.name === "Admin Games");

    // إذا عنده رتبة الأدمن → يظهر الإجابة للجميع
    if (isAdmin) {
      points.addPoints(i.user.id, config.points.char);
      return i.followUp({
        content: `🔍 الشخصية هي: **${name}**\n🔥 +${config.points.char} نقاط`,
        ephemeral: false
      });
    }

    // إذا لاعب عادي → ما يشوف الإجابة
    return i.followUp({
      content: "❌ ما تقدر تشوف الإجابة! فقط رتبة **Admin Games** تقدر.",
      ephemeral: false
    });
  }
};
