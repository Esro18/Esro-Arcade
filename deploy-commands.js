const { REST, Routes } = require('discord.js');
const fs = require('fs');
require('dotenv').config();

const commands = [];
const commandFiles = fs.readdirSync('./commands/admin').filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const cmd = require(`./commands/admin/${file}`);
  commands.push(cmd.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('🔄 جاري تسجيل أوامر السلاش...');

    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );

    console.log('✅ تم تسجيل أوامر السلاش بنجاح!');
  } catch (error) {
    console.error(error);
  }
})();