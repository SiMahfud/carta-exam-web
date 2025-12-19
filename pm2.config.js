module.exports = {
    apps: [
        {
            name: 'carta-exam',
            script: 'npm',
            args: 'start',
            exec_mode: 'fork',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'production',
            },
        },
    ],
};
