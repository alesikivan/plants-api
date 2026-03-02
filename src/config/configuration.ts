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
  };
};
