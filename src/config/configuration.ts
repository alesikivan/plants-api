export default () => {
  const requiredEnvVars = [
    'MONGODB_URI',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }

  return {
    port: parseInt(process.env.PORT, 10) || 3001,
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    database: {
      uri: process.env.MONGODB_URI,
    },
    jwt: {
      accessSecret: process.env.JWT_ACCESS_SECRET,
      refreshSecret: process.env.JWT_REFRESH_SECRET,
      accessExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',
      refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
    },
    telegram: {
      botToken: process.env.TELEGRAM_BOT_TOKEN,
      chatId: process.env.TELEGRAM_CHAT_ID,
      // Community group (chat) where users' plants/history are auto-published
      communityChatId: process.env.TELEGRAM_COMMUNITY_CHAT_ID,
      // Optional topic ids (group with Topics enabled): plants and history go to separate topics
      communityPlantsThreadId: process.env.TELEGRAM_COMMUNITY_PLANTS_THREAD_ID,
      communityHistoryThreadId: process.env.TELEGRAM_COMMUNITY_HISTORY_THREAD_ID,
      communityUrl: process.env.TELEGRAM_COMMUNITY_URL,
      // Base URL for links inside community posts (defaults to FRONTEND_URL). Telegram does not render localhost links,
      // so locally you may point this to a public domain for visual testing.
      communitySiteUrl: process.env.TELEGRAM_COMMUNITY_SITE_URL,
    },
    smtp: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      from: process.env.SMTP_FROM || '"PlantSheep" <noreply@example.com>',
    },
  };
};
