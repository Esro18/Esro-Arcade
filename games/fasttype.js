const points = require('../systems/points');
const cooldown = require('../systems/cooldown');
const config = require('../systems/gameconfig');

const words = ["discord", "mafia", "riddle", "gaming", "speed", "bot", "javascript"];

let active = {};

module.exports = {
  start(msg) {
    const w = words[Math.floor(Math.random() * words.length)];
    active[msg.channel.id] = w;

    msg.reply(`⚡ اكتب الكلمة التالية بسرعة:\n**${w}**`);
  },

  handle(i) {
    // كول داون
    if (cooldown.check(i.user.id, 'fasttype', config.cooldown)) {
      return i.reply({ content: '⏳ انتظر قبل ما تلعب مرة ثانية.', ephemeral: true });
    }

    // هذا النوع يعتمد على الرسائل وليس الأزرار
    // لذلك لازم يكون عندك event في index.js يستقبل الرسائل ويقارنها بالكلمة
    // أما هنا فـ handle ما راح يستخدم لأن ما فيه أزرار

    return; // ما يحتاج رد هنا
  }
};
