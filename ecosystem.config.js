module.exports = {
  apps: [
    {
      name: 'plants-backend',
      script: './dist/main.js',
      env: {
        PORT: 3008,
        NODE_ENV: 'production'
      }
    }
  ],

  deploy: {
    production: {
      user: 'root',
      host: '77.37.49.238',
      ref: 'origin/main',
      repo: 'https://github.com/alesikivan/plants-api',
      path: '/root/apps/plants-backend',

      'post-deploy': `
        set -e

        export NVM_DIR="/root/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

        nvm use --lts

        npm ci
        npm run build

        pm2 delete plants-backend || true
        pm2 start ecosystem.config.js
        pm2 save --force
      `
    }
  }
};
