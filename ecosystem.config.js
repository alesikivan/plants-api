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
          export NVM_DIR="$HOME/.nvm"
          [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

          npm install
          npm run build || exit 1
          /root/.nvm/versions/node/v20.20.0/bin/pm2 restart plants-backend || /root/.nvm/versions/node/v20.20.0/bin/pm2 start ./dist/main.js --name plants-backend
          /root/.nvm/versions/node/v20.20.0/bin/pm2 save --force
        `
      }
    }
  };