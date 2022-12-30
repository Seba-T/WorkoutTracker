module.exports = {
  apps: [
    {
      script: "dist/index.js",
      watch: ".",
    },
  ],

  deploy: {
    production: {
      user: "SSH_USERNAME",
      host: "SSH_HOSTMACHINE",
      ref: "origin/main",
      repo: "GIT_REPOSITORY",
      path: "DESTINATION_PATH",
      "pre-deploy-local": "",
      "post-deploy":
        "pnpm install && pm2 reload ecosystem.config.cjs --env production",
      "pre-setup": "",
    },
  },
};
