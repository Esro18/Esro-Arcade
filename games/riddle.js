const points = require('../systems/points');
const cooldown = require('../systems/cooldown');
const config = require('../systems/gameconfig');

const riddles = [
  { q: "شيء إذا تكلمت عنه انكسر؟", a: "الصمت" },
  { q: "يمشي بلا أرجل ويبكي بلا عيون؟", a: "السحاب" },
  { q: "له أسنان ولا يعض؟", a: "المشط" }
];

let active = {};

module.exports = {
  start(msg) {
    const r = riddles[Math.floor(Math.random() * riddles.length)];
    active[msg.channel.id] = r;

    msg.reply(`🔮 **لغز:**\n${r.q}\n\n✍️ اكتب الإجابة في الشات`);
  },

  checkMessage(msg) {
    const r = active[msg.channel.id];
    if (!r) return;

    if (msg.content.trim() === r.a) {
      points.addPoints(msg.author.id, config.points.riddle);
      msg.reply(`🔥 ${msg.author} جاوب صح! الإجابة: **${r.a}** (+${config.points.riddle})`);
      delete active[msg.channel.id];
    }
  }
};