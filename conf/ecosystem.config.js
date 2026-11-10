const fs = require("fs");
const path = require("path");

// The agentlytics binary that SetupVibe installs and validates. npx would
// resolve the package again on every PM2 restart, without a pinned version.
// On Linux the installer puts npm globals in ~/.npm-global/bin, which the sudo
// secure_path drops from PM2's PATH, so that location is checked first.
const npmGlobalAgentlytics = path.join(process.env.HOME || "", ".npm-global", "bin", "agentlytics");
const agentlytics = fs.existsSync(npmGlobalAgentlytics) ? npmGlobalAgentlytics : "agentlytics";

module.exports = {
  apps: [
    {
      name: "agentlytics",
      script: agentlytics,
      instances: 1,
      exec_mode: "fork",
      watch: false,
      autorestart: true,
      max_memory_restart: "200M",
    },
  ],
};
