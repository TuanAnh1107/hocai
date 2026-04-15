const fs = require('fs');

function isTruthy(value) {
    return ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase());
}

function getSslConfig() {
    if (!isTruthy(process.env.DB_SSL_ENABLED)) {
        return undefined;
    }

    const sslConfig = {
        minVersion: 'TLSv1.2'
    };

    const caPath = (process.env.DB_SSL_CA_PATH || '').trim();
    if (caPath) {
        sslConfig.ca = fs.readFileSync(caPath);
    }

    if (process.env.DB_SSL_REJECT_UNAUTHORIZED === 'false') {
        sslConfig.rejectUnauthorized = false;
    }

    return sslConfig;
}

module.exports = {
    HOST: process.env.DB_HOST || "localhost",
    USER: process.env.DB_USER,
    PASSWORD: process.env.DB_PASSWORD,
    DB: process.env.DB_NAME,
    PORT: process.env.DB_PORT || 3306,
    SSL: getSslConfig(),
    dialect: "mysql",
    pool: {
        max: parseInt(process.env.DB_POOL_MAX) || 5,
        min: parseInt(process.env.DB_POOL_MIN) || 0,
        acquire: 30000,
        idle: 10000
    }
};
