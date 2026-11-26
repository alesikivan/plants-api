// Staging: a production-like copy on the same server, deployed from the `staging` branch.
//   pm2 deploy ecosystem.staging.config.js staging          (first time: add `setup` before `staging`)
// Server-side .env (not in git) lives in /root/apps/plants-backend-staging/source/.env:
//   own MONGODB_URI database, JWT secrets, FRONTEND_URL=https://stage.plantsheep.com,
//   COOKIE_DOMAIN=.stage.plantsheep.com, AUTH_COOKIE_PREFIX=stage_, PORT=3018
module.exports = {
  apps: [
    {
      name: 'plants-backend-staging',
      script: './dist/main.js',
      env: {
        PORT: 3018,
        NODE_ENV: 'production'
      }
    }
  ],

  deploy: {
    staging: {
      user: 'root',
      host: '72.61.176.248',
      ref: 'origin/staging',
      repo: 'https://github.com/alesikivan/plants-api',
      path: '/root/apps/plants-backend-staging',

      // `|| true`: the first deploy has no process to delete yet
      'post-deploy': `source ~/.nvm/nvm.sh && npm install && npm run build && (pm2 delete plants-backend-staging || true) && pm2 start ecosystem.staging.config.js && pm2 save --force`
    }
  }
};
