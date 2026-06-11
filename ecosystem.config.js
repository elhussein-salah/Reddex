module.exports = {
  apps: [
    {
      name: 'reddex',
      script: 'dist/src/main.js',
      node_args: '--max-old-space-size=512',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
