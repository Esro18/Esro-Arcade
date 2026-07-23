require('dotenv').config();
const fs = require('fs');
const { Client, GatewayIntentBits } = require('discord.js');

// صلاحيات الأدمن
function isAdmin(member) {
  return member.roles.cache.some(r => r.name === "Admin Games");
}

// الألعاب
const riddles = require('./games/riddle');
const mafia = require('./games/mafia');
const truefalse = require('./games/truefalse');
const fasttype = require('./games/fasttype');
const flags = require('./games/flags');
const char = require('./games/char');
const rps = require('./games/rps');
const click = require('./games/click');
const missing = require('./games/missing');
const quiz = require('./games/quiz');
const menu = require('./games/menu');

// إنشاء العميل
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// تحميل أوامر السلاش
client.commands = new Map();
const commandFiles = fs.readdirSync('./commands/admin').filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const cmd = require(`./commands/admin/${file}`);
  client.commands.set(cmd.data.name, cmd);
}

console.log("✔️ Slash commands loaded:", client.commands.size);

// جاهزية البوت
client.once('ready', () => {
  console.log(`🔥 Logged in as ${client.user.tag}`);
});

// أوامر الرسائل
client.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;

  riddles.checkMessage(msg);

  if (msg.content === '!games') return menu.start(msg);
});

// تفاعل الأزرار + القائمة + السلاش
client.on('interactionCreate', async (i) => {

  // صلاحيات الأدمن
  if (!isAdmin(i.member)) {
    return i.reply({
      content: "❌ ما عندك صلاحية تتحكم بالبوت.",
      ephemeral: true
    });
  }

  // قائمة الألعاب
  if (i.isStringSelectMenu()) {
    await i.deferReply({ ephemeral: true }).catch(() => {});
    return menu.handle(i, {
      riddle: riddles,
      mafia: mafia,
      truefalse: truefalse,
      fasttype: fasttype,
      flags: flags,
      char: char,
      rps: rps,
      click: click,
      missing: missing,
      quiz: quiz
    });
  }

  // أزرار الألعاب
  if (i.isButton()) {
    await i.deferReply({ ephemeral: true }).catch(() => {});

    const handlers = {
      riddle_: riddles,
      mafia_: mafia,
      tf_: truefalse,
      flag_: flags,
      char_: char,
      rps_: rps,
      click_: click,
      missing_: missing,
      quiz_: quiz
    };

    for (const prefix in handlers) {
      if (i.customId.startsWith(prefix)) {
        return handlers[prefix].handle(i);
      }
    }
  }

  // أوامر السلاش
  if (i.isChatInputCommand()) {
    await i.deferReply({ ephemeral: true }).catch(() => {});

    const command = client.commands.get(i.commandName);
    if (!command) return;

    const gameState = {
      locked: false,
      current: null
    };

    await command.execute(
      i,
      {
        riddle: riddles,
        mafia: mafia,
        truefalse: truefalse,
        fasttype: fasttype,
        flags: flags,
        char: char,
        rps: rps,
        click: click,
        missing: missing,
        quiz: quiz
      },
      gameState
    );
  }
});

// حماية من الأخطاء
process.on("uncaughtException", err => console.log("❌ Error:", err));
process.on("unhandledRejection", err => console.log("❌ Promise Error:", err));

// تشغيل البوت
client.login(process.env.TOKEN);
