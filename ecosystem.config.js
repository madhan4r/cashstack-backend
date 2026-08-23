module.exports = {
  apps: [
    {
      name: 'cashstack-backend',
      cwd: __dirname,
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      time: true,
      merge_logs: true,
      max_memory_restart: '512M',
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-error.log',
      log_file: './logs/pm2-combined.log',
      env: {
        NODE_ENV: 'production',
        FIREBASE_SERVICE_ACCOUNT_PATH: '/etc/cashstack/firebase-admin.json'
      },
    },
  ],
};
