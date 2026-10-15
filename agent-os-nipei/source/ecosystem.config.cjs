module.exports = {
  apps: [
    {
      name: "nipei-control-online",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3333 -H 0.0.0.0",
      cwd: "/var/www/nipei-control/agent-os-nipei/source",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: "3333",
        VAULT_PATH: "/var/www/nipei-vault",
      },
    },
  ],
};
