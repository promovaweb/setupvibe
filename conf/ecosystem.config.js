module.exports = {
  apps: [
    {
      name: "agentlytics",
      script: "npx",
      args: "agentlytics",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      autorestart: true,
      max_memory_restart: "200M",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
