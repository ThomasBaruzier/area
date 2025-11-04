import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  const github = await prisma.service.upsert({
    where: { name: 'github' },
    update: {},
    create: {
      name: 'github',
      description: 'GitHub actions and reactions.',
    },
  });

  await prisma.action.createMany({
    data: [
      {
        name: 'push',
        description: 'New push to repository',
        serviceId: github.id,
        jsonFormat: { owner: 'string', repo: 'string', branch: 'string' },
      },
      {
        name: 'issues',
        description: 'New issue created',
        serviceId: github.id,
        jsonFormat: { owner: 'string', repo: 'string', label: 'string' },
      },
      {
        name: 'pull_request',
        description: 'New pull request state',
        serviceId: github.id,
        jsonFormat: { owner: 'string', repo: 'string', prAction: 'string' },
      },
    ],
    skipDuplicates: true,
  });

  await prisma.reaction.createMany({
    data: [
      {
        name: 'create_issue',
        description: 'Create a new issue',
        serviceId: github.id,
        jsonFormat: {
          owner: 'string',
          repo: 'string',
          title: 'string',
          body: 'string',
        },
      },
      {
        name: 'create_release',
        description: 'Create new release',
        serviceId: github.id,
        jsonFormat: {
          owner: 'string',
          repo: 'string',
          tag_name: 'string',
          name: 'string',
          body: 'string',
          target_commitish: 'string',
        },
      },
      {
        name: 'create_comment',
        description: 'Create comment on issue or PR',
        serviceId: github.id,
        jsonFormat: {
          owner: 'string',
          repo: 'string',
          issue_number: 'number',
          body: 'string',
        },
      },
    ],
    skipDuplicates: true,
  });

  const google = await prisma.service.upsert({
    where: { name: 'google' },
    update: {},
    create: {
      name: 'google',
      description: 'Google services actions and reactions',
    },
  });

  const twitch = await prisma.service.upsert({
    where: { name: 'twitch' },
    update: {},
    create: {
      name: 'twitch',
      description: 'Twitch actions and reactions',
    },
  });

  await prisma.action.createMany({
    data: [
      {
        name: 'mail_received',
        description: 'New email received',
        serviceId: google.id,
        jsonFormat: { from: 'string', subject: 'string' },
      },
      {
        name: 'stream_offline',
        description: 'Stream went offline',
        serviceId: twitch.id,
        jsonFormat: { streamerName: 'string' },
      },
      {
        name: 'stream_online',
        description: 'Stream went online',
        serviceId: twitch.id,
        jsonFormat: { streamerName: 'string' },
      },
      {
        name: 'user_update',
        description: 'User profile updated',
        serviceId: twitch.id,
        jsonFormat: {},
      },
      {
        name: 'user_whisper_message',
        description: 'Whisper message received',
        serviceId: twitch.id,
        jsonFormat: {},
      },
    ],
    skipDuplicates: true,
  });

  await prisma.reaction.createMany({
    data: [
      {
        name: 'send_mail',
        description: 'Send email',
        serviceId: google.id,
        jsonFormat: { to: 'string', subject: 'string', message: 'string' },
      },
      {
        name: 'send_message_twitch',
        description: 'Send message in Twitch chat',
        serviceId: twitch.id,
        jsonFormat: { userName: 'string', streamerName: 'string', message: 'string' },
      },
    ],
    skipDuplicates: true,
  });

  const spotify = await prisma.service.upsert({
    where: { name: 'spotify' },
    update: {},
    create: {
      name: 'spotify',
      description: 'Spotify reactions',
    },
  });

  await prisma.reaction.createMany({
    data: [
      {
        name: 'create_playlist',
        description: 'Create a playlist',
        serviceId: spotify.id,
        jsonFormat: { owner: 'string', name: 'string', description: 'string', isPublic: 'boolean' },
      },
      {
        name: 'change_volume',
        description: 'Change volume percentage',
        serviceId: spotify.id,
        jsonFormat: { volume: 'string' },
      },
      {
        name: 'pause_playback',
        description: 'Pause music playback',
        serviceId: spotify.id,
        jsonFormat: {},
      },
      {
        name: 'skip_to_next',
        description: 'Skip to next track',
        serviceId: spotify.id,
        jsonFormat: {},
      },
      {
        name: 'skip_to_previous',
        description: 'Skip to previous track',
        serviceId: spotify.id,
        jsonFormat: {},
      },
    ],
    skipDuplicates: true,
  });

  const discord = await prisma.service.upsert({
    where: { name: 'discord' },
    update: {},
    create: {
      name: 'discord',
      description: 'Discord actions and reactions',
    },
  });

  await prisma.action.createMany({
    data: [
      {
        name: 'new_message',
        description: 'New message sent in channel',
        serviceId: discord.id,
        jsonFormat: { channelId: 'string' },
      },
    ],
    skipDuplicates: true,
  });

  await prisma.reaction.createMany({
    data: [
      {
        name: 'send_message',
        description: 'Send message to channel',
        serviceId: discord.id,
        jsonFormat: { channelId: 'string', message: 'string' },
      },
    ],
    skipDuplicates: true,
  });

  await microsoftSeed();

  console.log('Seeding finished.');
}

async function microsoftSeed() {
  const microsoft = await prisma.service.upsert({
    where: { name: 'microsoft' },
    update: {},
    create: {
      name: 'microsoft',
      description: 'Microsoft services actions and reactions',
    },
  });

  await prisma.action.createMany({
    data: [
      {
        name: 'mail_received',
        description: 'New email received',
        serviceId: microsoft.id,
        jsonFormat: { from: 'string', subject: 'string' },
      },
    ],
    skipDuplicates: true,
  });

  await prisma.reaction.createMany({
    data: [
      {
        name: 'send_mail',
        description: 'Send email',
        serviceId: microsoft.id,
        jsonFormat: { to: 'string', subject: 'string', message: 'string' },
      },
    ],
    skipDuplicates: true,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
