const Config = require('../props/config.json');
const { getStrings } = require('../plugins/checklang.js');
const { isOnSpamWatch } = require('../plugins/lib-spamwatch/spamwatch.js');
const spamwatchMiddleware = require('../plugins/lib-spamwatch/Middleware.js')(isOnSpamWatch);
const os = require('os');
const { exec } = require('child_process');

function getGitCommitHash() {
  return new Promise((resolve, reject) => {
    exec('git rev-parse --short HEAD', (error, stdout, stderr) => {
      if (error) {
        reject(`Error: ${stderr}`);
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

function formatUptime(uptime) {
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);
  return `${hours}h ${minutes}m ${seconds}s`;
}

function getSystemInfo() {
  const { platform, release, arch, cpus, totalmem, freemem, loadavg, uptime } = os;
  const [cpu] = cpus();
  return `*Server Stats*\n\n` +
    `*OS:* \`${platform()} ${release()}\`\n` +
    `*Arch:* \`${arch()}\`\n` +
    `*Node.js Version:* \`${process.version}\`\n` +
    `*CPU:* \`${cpu.model}\`\n` +
    `*CPU Cores:* \`${cpus().length} cores\`\n` +
    `*RAM:* \`${(freemem() / (1024 ** 3)).toFixed(2)} GB / ${(totalmem() / (1024 ** 3)).toFixed(2)} GB\`\n` +
    `*Load Average:* \`${loadavg().map(avg => avg.toFixed(2)).join(', ')}\`\n` +
    `*Uptime:* \`${formatUptime(uptime())}\`\n\n`;
}

async function handleAdminCommand(ctx, action, successMessage, errorMessage) {
  const Strings = getStrings(ctx.from.language_code);
  const userId = ctx.from.id;
  if (Config.admins.includes(userId)) {
    try {
      await action();
      ctx.reply(successMessage, {
        parse_mode: 'Markdown',
        reply_to_message_id: ctx.message.message_id
      });
    } catch (error) {
      ctx.reply(errorMessage.replace('{error}', error.message), {
        parse_mode: 'Markdown',
        reply_to_message_id: ctx.message.message_id
      });
    }
  } else {
    ctx.reply(Strings.botAdminOnly, {
      reply_to_message_id: ctx.message.message_id
    });
  }
}

module.exports = (bot) => {
  bot.command('getbotstats', spamwatchMiddleware, async (ctx) => {
    const Strings = getStrings(ctx.from.language_code);
    handleAdminCommand(ctx, async () => {
      const stats = getSystemInfo();
      await ctx.reply(stats, {
        parse_mode: 'Markdown',
        reply_to_message_id: ctx.message.message_id
      });
    }, '', Strings.errorRetrievingStats);
  });

  bot.command('getbotcommit', spamwatchMiddleware, async (ctx) => {
    const Strings = getStrings(ctx.from.language_code);
    handleAdminCommand(ctx, async () => {
      try {
        const commitHash = await getGitCommitHash();
        await ctx.reply(Strings.currentCommit.replace('{commitHash}', commitHash), {
          parse_mode: 'Markdown',
          reply_to_message_id: ctx.message.message_id
        });
      } catch (error) {
        ctx.reply(Strings.errorRetrievingCommit.replace('{error}', error), {
          parse_mode: 'Markdown',
          reply_to_message_id: ctx.message.message_id
        });
      }
    }, '', Strings.errorRetrievingCommit);
  });
  
  bot.command('setbotname', spamwatchMiddleware, async (ctx) => {
    const Strings = getStrings(ctx.from.language_code);
    const botName = ctx.message.text.split(' ').slice(1).join(' ');
    handleAdminCommand(ctx, async () => {
      await ctx.telegram.setMyName(botName);
    }, Strings.botNameChanged.replace('{botName}', botName), Strings.botNameErr.replace('{tgErr}', '{error}'));
  });

  bot.command('setbotdesc', spamwatchMiddleware, async (ctx) => {
    const Strings = getStrings(ctx.from.language_code);
    const botDesc = ctx.message.text.split(' ').slice(1).join(' ');
    handleAdminCommand(ctx, async () => {
      await ctx.telegram.setMyDescription(botDesc);
    }, Strings.botDescChanged.replace('{botDesc}', botDesc), Strings.botDescErr.replace('{tgErr}', '{error}'));
  });

  bot.command('botkickme', spamwatchMiddleware, async (ctx) => {
    const Strings = getStrings(ctx.from.language_code);
    handleAdminCommand(ctx, async () => {
      ctx.reply(Strings.kickingMyself, {
        parse_mode: 'Markdown',
        reply_to_message_id: ctx.message.message_id
      });
      await ctx.telegram.leaveChat(ctx.chat.id);
    }, '', Strings.kickingMyselfErr);
  });
};
