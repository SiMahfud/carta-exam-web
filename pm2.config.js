module.exports = {
    apps: [
        {
            name: 'carta-exam',
            script: 'node_modules/next/dist/bin/next',
            args: 'start -p 3333',
            exec_mode: 'fork',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'production',
                NODE_OPTIONS: '--localstorage-file=./.localstorage.json',
            },
        },
    ],
};
