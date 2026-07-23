const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder
} = require('discord.js');

const points = require('../systems/points');
const cooldown = require('../systems/cooldown');
const config = require('../systems/gameconfig');

let game = {
  hostId: null,
  adminId: null,
  players: new Map(),
  started: false,
  nightPhase: false,
  dayPhase: false,
  mafiaTargets: new Map(),
  mafiaCount: 0,
  doctorSelfUsed: 0,
  currentNight: 1,
  pendingKill: null,
  votes: new Map(),
  skipVotes: new Set(),
  channelId: null
};

const ROLES = {
  MAFIA: 'مافيا',
  DOCTOR: 'دكتور',
  DETECTIVE: 'محقق',
  CIVIL: 'مواطن'
};

function resetGame() {
  game = {
    hostId: null,
    adminId: null,
    players: new Map(),
    started: false,
    nightPhase: false,
    dayPhase: false,
    mafiaTargets: new Map(),
    mafiaCount: 0,
    doctorSelfUsed: 0,
    currentNight: 1,
    pendingKill: null,
    votes: new Map(),
    skipVotes: new Set(),
    channelId: null
  };
}

function getAlivePlayers() {
  return [...game.players.values()].filter(p => p.alive);
}

function assignRoles() {
  const aliveIds = [...game.players.keys()];
  const count = aliveIds.length;

  let mafiaCount = count < 6 ? 1 : 2;
  game.mafiaCount = mafiaCount;

  const shuffled = [...aliveIds].sort(() => Math.random() - 0.5);

  const mafiaIds = shuffled.slice(0, mafiaCount);
  const doctorId = shuffled[mafiaCount] || null;
  const detectiveId = shuffled[mafiaCount + 1] || null;

  shuffled.forEach(id => {
    let role = ROLES.CIVIL;
    if (mafiaIds.includes(id)) role = ROLES.MAFIA;
    else if (id === doctorId) role = ROLES.DOCTOR;
    else if (id === detectiveId) role = ROLES.DETECTIVE;

    game.players.set(id, {
      id,
      role,
      alive: true
    });
  });
}

async function sendRoleMessage(i, player) {
  const channel = await i.client.channels.fetch(game.channelId).catch(() => null);
  if (!channel) return;

  let content = '';
  if (player.role === ROLES.MAFIA) {
    const mafiaPlayers = [...game.players.values()].filter(
      p => p.role === ROLES.MAFIA && p.id !== player.id
    );
    if (game.mafiaCount === 1) {
      content = `المافيا افتح عيونك.\nأنت **مافيا** لوحدك هذه الجولة.`;
    } else {
      const mates = mafiaPlayers.map(p => `<@${p.id}>`).join(', ');
      content = `المافيا افتح عيونك.\nأنت **مافيا**.\nالمافيا معك: ${mates}`;
    }
  } else if (player.role === ROLES.DOCTOR) {
    content = `الدكتور افتح عيونك.\nاختر شخص تحميه أو تحمي نفسك.`;
  } else if (player.role === ROLES.DETECTIVE) {
    content = `المحقق افتح عيونك.\nاختر شخص تسأل عنه.`;
  } else {
    content = `أنت **مواطن**.\nحاول تكشف المافيا.`;
  }

  await channel.send({
    content,
    allowedMentions: { users: [player.id] }
  });
}

async function startNight(client, channel) {
  game.nightPhase = true;
  game.dayPhase = false;
  game.mafiaTargets.clear();
  game.pendingKill = null;
  game.votes.clear();
  game.skipVotes.clear();

  await channel.send('🌙 بدأ الليل…');

  for (const player of game.players.values()) {
    if (!player.alive) continue;
    await sendRoleMessage({ client }, player);
  }

  await setupMafiaPhase(client, channel);
  await setupDoctorPhase(client, channel);
  await setupDetectivePhase(client, channel);
}

async function setupMafiaPhase(client, channel) {
  const mafiaPlayers = [...game.players.values()].filter(
    p => p.role === ROLES.MAFIA && p.alive
  );
  if (mafiaPlayers.length === 0) return;

  const alive = getAlivePlayers().filter(p => p.role !== ROLES.MAFIA);
  if (alive.length === 0) return;

  const row = new ActionRowBuilder().addComponents(
    ...alive.slice(0, 5).map(p =>
      new ButtonBuilder()
        .setCustomId(`mafia_target_${p.id}`)
        .setLabel(`قتل ${p.id}`)
        .setStyle(ButtonStyle.Danger)
    )
  );

  await channel.send({
    content: '🔪 المافيا: اختاروا الهدف.',
    components: [row]
  });
}

async function setupDoctorPhase(client, channel) {
  const doctor = [...game.players.values()].find(
    p => p.role === ROLES.DOCTOR && p.alive
  );
  if (!doctor) return;

  const alive = getAlivePlayers();

  const row = new ActionRowBuilder().addComponents(
    ...alive.slice(0, 5).map(p =>
      new ButtonBuilder()
        .setCustomId(`doctor_protect_${p.id}`)
        .setLabel(`حماية ${p.id}`)
        .setStyle(ButtonStyle.Primary)
    )
  );

  await channel.send({
    content: '🩺 الدكتور: اختر شخص تحميه.',
    components: [row]
  });
}

async function setupDetectivePhase(client, channel) {
  const detective = [...game.players.values()].find(
    p => p.role === ROLES.DETECTIVE && p.alive
  );
  if (!detective) return;

  const alive = getAlivePlayers().filter(p => p.id !== detective.id);

  const row = new ActionRowBuilder().addComponents(
    ...alive.slice(0, 5).map(p =>
      new ButtonBuilder()
        .setCustomId(`detective_check_${p.id}`)
        .setLabel(`فحص ${p.id}`)
        .setStyle(ButtonStyle.Secondary)
    )
  );

  await channel.send({
    content: '🔍 المحقق: اختر شخص تفحصه.',
    components: [row]
  });
}

async function resolveNight(channel) {
  game.nightPhase = false;
  game.currentNight++;

  const killedId = game.pendingKill?.targetId || null;
  if (!killedId) {
    await channel.send('🌅 الصباح: لم يتم قتل أحد.');
  } else {
    const player = game.players.get(killedId);
    if (!player || !player.alive) {
      await channel.send('🌅 الصباح: الهدف غير صالح.');
    } else {
      player.alive = false;
      await channel.send(`🌅 الصباح: تم قتل <@${killedId}>.`);
    }
  }

  await startDay(channel);
}

async function startDay(channel) {
  game.dayPhase = true;
  game.votes.clear();
  game.skipVotes.clear();

  const alive = getAlivePlayers();
  if (alive.length <= 1) {
    await channel.send('🎮 انتهت اللعبة.');
    return;
  }

  const row = new ActionRowBuilder().addComponents(
    ...alive.slice(0, 5).map(p =>
      new ButtonBuilder()
        .setCustomId(`day_vote_${p.id}`)
        .setLabel(`تصويت ${p.id}`)
        .setStyle(ButtonStyle.Secondary)
    ),
    new ButtonBuilder()
      .setCustomId('day_skip')
      .setLabel('تخطي')
      .setStyle(ButtonStyle.Primary)
  );

  await channel.send({
    content: '🌞 النهار: صوتوا.',
    components: [row]
  });
}

function checkWin(channel) {
  const alive = getAlivePlayers();
  const mafiaAlive = alive.filter(p => p.role === ROLES.MAFIA).length;
  const civAlive = alive.filter(p => p.role !== ROLES.MAFIA).length;

  if (mafiaAlive === 0) {
    channel.send('🎉 فوز المواطنين!');
    return true;
  }

  if (mafiaAlive >= civAlive) {
    channel.send('🔥 فوز المافيا!');
    return true;
  }

  return false;
}

module.exports = {
  start(msg) {
    resetGame();
    game.hostId = msg.author.id;
    game.channelId = msg.channel.id;

    const embed = new EmbedBuilder()
      .setTitle('🎭 لعبة المافيا')
      .setDescription(
        'اضغط **انضمام**.\nالحد الأدنى: 4 لاعبين.\nالحد الأقصى: 10 لاعبين.'
      )
      .setColor(0x8b0000);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('mafia_join')
        .setLabel('انضمام')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('mafia_start')
        .setLabel('بدء اللعبة')
        .setStyle(ButtonStyle.Danger)
    );

msg.channel.send({
  embeds: [embed],
  components: [row]
});
  },

  async handle(i) {
    await i.deferReply({ ephemeral: true }).catch(() => {});

    const client = i.client;

    if (cooldown.check(i.user.id, 'mafia', config.cooldown)) {
      return i.editReply({ content: '⏳ انتظر قبل ما تلعب مرة ثانية.' });
    }

    if (i.customId === 'mafia_join') {
      if (game.started) {
        return i.editReply({ content: 'اللعبة بدأت بالفعل.' });
      }

      if (game.players.size >= 10) {
        return i.editReply({ content: 'وصلنا الحد الأقصى (10 لاعبين).' });
      }

      game.players.set(i.user.id, { id: i.user.id, role: null, alive: true });

      return i.editReply({
        content: `انضم ${i.user}. عدد اللاعبين الآن: ${game.players.size}`
      });
    }

    if (i.customId === 'mafia_start') {
      if (i.user.id !== game.hostId) {
        return i.editReply({ content: 'فقط صاحب اللعبة يقدر يبدأها.' });
      }

      if (game.players.size < 4) {
        return i.editReply({ content: 'تحتاج 4 لاعبين على الأقل.' });
      }

      game.started = true;
      assignRoles();

      let result = '';
      for (const p of game.players.values()) {
        result += `<@${p.id}> → **${p.role}**\n`;
      }

      await i.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle('🎭 توزيع الأدوار')
            .setDescription(result)
            .setColor(0x00ffff)
        ],
        components: []
      });

      const guild = i.guild;
      const participants = [...game.players.keys()];
      const adminRole = guild.roles.cache.find(r => r.name === 'Admin Games');
      const admins = adminRole ? adminRole.members.map(m => m.id) : [];

      const options = participants.map(id => {
        const member = guild.members.cache.get(id);
        const isAdmin = admins.includes(id);
        return {
          label: isAdmin
            ? `${member.user.username} (Admin Games)`
            : member.user.username,
          value: id
        };
      });

      const adminSelect = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('mafia_choose_admin')
          .setPlaceholder('اختر الأدمن')
          .addOptions(options)
      );

      await i.followUp({
        content: 'اختر الأدمن:',
        components: [adminSelect],
        ephemeral: false
      });

      return;
    }

    if (i.customId === 'mafia_choose_admin') {
      const chosenId = i.values[0];
      game.adminId = chosenId;

      await i.editReply({
        content: `تم اختيار <@${chosenId}> كأدمن اللعبة.`,
        components: []
      });

      const channel = await client.channels.fetch(game.channelId).catch(() => null);
      if (channel) await startNight(client, channel);
      return;
    }

    if (i.customId.startsWith('mafia_target_')) {
      const targetId = i.customId.split('_')[2];
      const mafia = game.players.get(i.user.id);
      if (!mafia || mafia.role !== ROLES.MAFIA || !mafia.alive) {
        return i.editReply({ content: 'هذا الخيار فقط للمافيا.' });
      }

      game.mafiaTargets.set(i.user.id, targetId);

      if (game.mafiaCount === 1) {
        game.pendingKill = { targetId };
        return i.editReply({ content: `تم اختيار الهدف: <@${targetId}>` });
      }

      const otherMafia = [...game.players.values()].find(
        p => p.role === ROLES.MAFIA && p.id !== i.user.id && p.alive
      );
      if (!otherMafia) {
        game.pendingKill = { targetId };
        return i.editReply({ content: `تم اختيار الهدف: <@${targetId}>` });
      }

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`mafia_confirm_yes_${targetId}`)
          .setLabel('موافق')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`mafia_confirm_no_${targetId}`)
          .setLabel('غير موافق')
          .setStyle(ButtonStyle.Danger)
      );

      const channel = await client.channels.fetch(game.channelId).catch(() => null);
      if (channel) {
        await channel.send({
          content: `المافيا الثاني: هل توافق على قتل <@${targetId}>؟`,
          components: [row]
        });
      }

      return i.editReply({ content: 'تم إرسال الطلب للمافيا الثاني.' });
    }

    if (i.customId.startsWith('mafia_confirm_')) {
      const parts = i.customId.split('_');
      const action = parts[2];
      const targetId = parts[3];

      const mafia = game.players.get(i.user.id);
      if (!mafia || mafia.role !== ROLES.MAFIA || !mafia.alive) {
        return i.editReply({ content: 'هذا الخيار فقط للمافيا.' });
      }

      if (action === 'yes') {
        game.pendingKill = { targetId };
        return i.editReply({ content: `تم تأكيد قتل <@${targetId}>.` });
      } else {
        game.pendingKill = null;
        return i.editReply({ content: 'تم رفض الهدف.' });
      }
    }

    if (i.customId.startsWith('doctor_protect_')) {
      const targetId = i.customId.split('_')[2];
      const doctor = game.players.get(i.user.id);
      if (!doctor || doctor.role !== ROLES.DOCTOR || !doctor.alive) {
        return i.editReply({ content: 'هذا الخيار فقط للدكتور.' });
      }

      if (targetId === i.user.id) {
        if (game.doctorSelfUsed >= 1 && game.currentNight < 3) {
          return i.editReply({
            content: 'ما تقدر تحمي نفسك الآن.'
          });
        }
        game.doctorSelfUsed++;
      }

      if (game.pendingKill && game.pendingKill.targetId === targetId) {
        game.pendingKill = null;
        return i.editReply({
          content: `🩺 تم إنقاذ <@${targetId}>.`
        });
      }

      return i.editReply({
        content: `🩺 تم حماية <@${targetId}>.`
      });
    }

    if (i.customId.startsWith('detective_check_')) {
      const targetId = i.customId.split('_')[2];
      const detective = game.players.get(i.user.id);
      if (!detective || detective.role !== ROLES.DETECTIVE || !detective.alive) {
        return i.editReply({ content: 'هذا الخيار فقط للمحقق.' });
      }

      const target = game.players.get(targetId);
      if (!target) {
        return i.editReply({ content: 'الهدف غير موجود.' });
      }

      const isKiller = target.role === ROLES.MAFIA;
      return i.editReply({
        content: isKiller
          ? '🔍 هذا الشخص **قاتل (مافيا)**.'
          : '🔍 هذا الشخص **ليس قاتلًا**.'
      });
    }

    if (i.customId === 'mafia_end_night') {
      const channel = await client.channels.fetch(game.channelId).catch(() => null);
      if (!channel) return;
      await resolveNight(channel);
      return i.editReply({ content: 'تم إنهاء الليل.' });
    }

    if (i.customId.startsWith('day_vote_')) {
      const targetId = i.customId.split('_')[2];
      const voter = game.players.get(i.user.id);
      if (!voter || !voter.alive) {
        return i.editReply({ content: 'فقط اللاعبين الأحياء يصوتون.' });
      }

      game.votes.set(i.user.id, targetId);
      game.skipVotes.delete(i.user.id);

      return i.editReply({
        content: `تم تسجيل تصويتك على <@${targetId}>.`
      });
    }

        if (i.customId.startsWith('day_vote_')) {
      const targetId = i.customId.split('_')[2];
      const voter = game.players.get(i.user.id);

      if (!voter || !voter.alive) {
        return i.editReply({ content: 'فقط اللاعبين الأحياء يقدرون يصوتون.' });
      }

      game.votes.set(i.user.id, targetId);
      game.skipVotes.delete(i.user.id);

      return i.editReply({
        content: `تم تسجيل تصويتك على <@${targetId}>.`
      });
    }

    if (i.customId === 'day_skip') {
      const voter = game.players.get(i.user.id);

      if (!voter || !voter.alive) {
        return i.editReply({ content: 'فقط اللاعبين الأحياء يقدرون يصوتون.' });
      }

      game.votes.delete(i.user.id);
      game.skipVotes.add(i.user.id);

      return i.editReply({
        content: 'تم تسجيل التخطي / السكب لك.'
      });
    }

    if (i.customId === 'day_end') {
      const channel = await client.channels.fetch(game.channelId).catch(() => null);
      if (!channel) return;

      const alive = getAlivePlayers();
      const totalAlive = alive.length;

      // إذا نص اللاعبين أو أكثر صوتوا تخطي
      if (game.skipVotes.size >= Math.ceil(totalAlive / 2)) {
        await channel.send('📢 تم التخطي، ما تم إعدام أحد هذا النهار.');
      } else {
        const counts = {};

        for (const targetId of game.votes.values()) {
          counts[targetId] = (counts[targetId] || 0) + 1;
        }

        let maxTarget = null;
        let maxCount = 0;

        for (const [tid, c] of Object.entries(counts)) {
          if (c > maxCount) {
            maxCount = c;
            maxTarget = tid;
          }
        }

        if (maxTarget && maxCount >= Math.ceil(totalAlive / 2)) {
          const target = game.players.get(maxTarget);

          if (target && target.alive) {
            target.alive = false;
            await channel.send(`⚖️ تم إعدام <@${maxTarget}> بالتصويت.`);
          } else {
            await channel.send('⚖️ الهدف غير صالح، ما تم إعدام أحد.');
          }
        } else {
          await channel.send('⚖️ ما فيه أغلبية واضحة، ما تم إعدام أحد.');
        }
      }

      if (!checkWin(channel)) {
        await startNight(client, channel);
      }

      return i.editReply({ content: 'تم إنهاء النهار.' });
    }

    if (i.customId === 'mafia_end_game') {
      if (i.user.id !== game.adminId) {
        return i.editReply({ content: 'فقط الأدمن يقدر ينهي اللعبة.' });
      }

      const channel = await client.channels.fetch(game.channelId).catch(() => null);
      if (!channel) return;

      await channel.send('🛑 تم إنهاء اللعبة من الأدمن.');
      resetGame();

      return i.editReply({ content: '✅ تم إنهاء اللعبة بنجاح.' });
    }
  } // نهاية handle
}; // نهاية module.exports
