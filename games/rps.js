const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const points = require('../systems/points');
const cooldown = require('../systems/cooldown');
const config = require('../systems/gameconfig');

const choices = ["حجر", "ورقة", "مقص"];

function getResult(user, bot) {
  if (user === bot) return "تعادل!";
  if (
    (user === "حجر" && bot === "مقص") ||
    (user === "ورقة" && bot === "حجر") ||
    (user === "مقص" && bot === "ورقة")
  ) return "فزت!";
  return "خسرت!";
}

module.exports = {
  start(msg) {
    msg.reply({
      content: "اختر:\nحجر - ورقة - مقص",
      components: [
        new ActionRowBuilder().addComponents(
          ...choices.map((c) =>
            new ButtonBuilder()
              .setCustomId(`rps_${c}`)
              .setLabel(c)
              .setStyle(ButtonStyle.Primary)
          )
        )
      ]
    });
  },

  handle(i) {
    // كول داون
    if (cooldown.check(i.user.id, 'rps', config.cooldown)) {
      return i.reply({ content: '⏳ انتظر قبل ما تلعب مرة ثانية.', ephemeral: true });
    }

    const userChoice = i.customId.split("_")[1];
    const botChoice = choices[Math.floor(Math.random() * choices.length)];
    const res = getResult(userChoice, botChoice);

    // إضافة نقاط إذا فاز
    if (res === "فزت!") {
      points.addPoints(i.user.id, config.points.rps);
    }

    return i.reply({
      content: `أنت اخترت: **${userChoice}**\nالبوت اختار: **${botChoice}**\nالنتيجة: ${res}`,
      ephemeral: true
    });
  }
};
