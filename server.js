require('dotenv').config();
const express = require('express');
const { engine } = require('express-handlebars');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');

const mainRouter = require('./routes/main');
const authRouter = require('./routes/authRoutes');
const chatRouter = require('./routes/chat');
const adminCoursesRouter = require('./routes/adminCourses');
const dbConfig = require('./config/db');

const app = express();
const port = parseInt(process.env.PORT, 10) || 3000;
const logsDir = path.join(__dirname, 'logs');
const accessLogPath = path.join(logsDir, 'access.log');
const errorLogPath = path.join(logsDir, 'error.log');
const isProduction = process.env.NODE_ENV === 'production';

if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

function isEnvFlagEnabled(name, defaultValue = false) {
    const value = process.env[name];
    if (value === undefined || value === null || value === '') {
        return defaultValue;
    }

    return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

function shouldTrustProxy() {
    return isEnvFlagEnabled('TRUST_PROXY', isProduction);
}

function shouldAutoInitDb() {
    return isEnvFlagEnabled('AUTO_INIT_DB', !isProduction);
}

function getSessionSecret() {
    const sessionSecret = (process.env.SESSION_SECRET || '').trim();
    if (sessionSecret) {
        return sessionSecret;
    }

    if (isProduction) {
        throw new Error('SESSION_SECRET must be set in production.');
    }

    return 'dev_only_session_secret_change_me';
}

function getStartupRetryAttempts() {
    const configuredAttempts = parseInt(process.env.STARTUP_RETRY_ATTEMPTS, 10);
    if (Number.isInteger(configuredAttempts) && configuredAttempts > 0) {
        return configuredAttempts;
    }

    return isProduction ? 12 : 1;
}

function getStartupRetryDelayMs() {
    const configuredDelay = parseInt(process.env.STARTUP_RETRY_DELAY_MS, 10);
    if (Number.isInteger(configuredDelay) && configuredDelay >= 0) {
        return configuredDelay;
    }

    return 5000;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Tách file dump SQL thành từng câu lệnh nhỏ.
 * @param {string} sql
 * @returns {string[]}
 */
function splitSqlStatements(sql) {
    return sql
        .split(/;\s*[\r\n]+/)
        .map((statement) => statement.trim())
        .filter(Boolean);
}

/**
 * Chạy file SQL để khởi tạo schema/dữ liệu mẫu.
 * @param {any} connection
 */
function shouldSkipSqlStatement(statement) {
    const normalized = statement
        .replace(/^\/\*![\s\S]*?\*\/\s*/, '')
        .trim()
        .toUpperCase();

    return normalized.startsWith('CREATE DATABASE')
        || normalized.startsWith('USE ')
        || normalized.startsWith('LOCK TABLES')
        || normalized.startsWith('UNLOCK TABLES')
        || normalized.includes('ALTER TABLE') && (
            normalized.includes('DISABLE KEYS')
            || normalized.includes('ENABLE KEYS')
        );
}

async function executeSqlFile(connection, { skipDatabaseStatements = false } = {}) {
    const sqlFilePath = path.join(__dirname, 'database', 'create_database.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    const statements = splitSqlStatements(sql);

    for (const statement of statements) {
        if (skipDatabaseStatements && shouldSkipSqlStatement(statement)) {
            continue;
        }

        await connection.query(statement);
    }
}

/**
 * Kiểm tra schema cốt lõi đã tồn tại hay chưa.
 * @param {any} connection
 * @returns {Promise<boolean>}
 */
async function hasCoreSchema(connection) {
    const [rows] = await connection.query(
        `SELECT COUNT(*) AS tableCount
         FROM information_schema.tables
         WHERE table_schema = ?
           AND table_name IN ('user_data', 'user_course', 'course_list', 'lesson_content')`,
        [dbConfig.DB]
    );

    return rows[0].tableCount === 4;
}

/**
 * Tạo bảng token đặt lại mật khẩu nếu chưa có.
 * @param {any} connection
 */
async function ensurePasswordResetTable(connection) {
    await connection.query(
        `CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id INT NOT NULL AUTO_INCREMENT,
            email VARCHAR(100) NOT NULL,
            token_hash CHAR(64) NOT NULL,
            expires_at DATETIME NOT NULL,
            used_at DATETIME DEFAULT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_password_reset_token_hash (token_hash),
            KEY idx_password_reset_email (email),
            CONSTRAINT fk_password_reset_user_email
                FOREIGN KEY (email) REFERENCES user_data(email)
                ON DELETE CASCADE
                ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`
    );
}

/**
 * Khởi tạo database an toàn.
 */
async function ensureDatabaseReady() {
    if (!dbConfig.USER || !dbConfig.PASSWORD || !dbConfig.DB) {
        throw new Error('Thiếu cấu hình DB_USER, DB_PASSWORD hoặc DB_NAME trong .env');
    }

    const adminConnection = await mysql.createConnection({
        host: dbConfig.HOST,
        user: dbConfig.USER,
        password: dbConfig.PASSWORD,
        port: dbConfig.PORT,
        ssl: dbConfig.SSL
    });

    try {
        const databaseName = String(dbConfig.DB).replace(/`/g, '');
        const [databaseRows] = await adminConnection.query(
            'SELECT SCHEMA_NAME FROM information_schema.schemata WHERE schema_name = ?',
            [databaseName]
        );
        const databaseExists = databaseRows.length > 0;

        if (!databaseExists) {
            if (!shouldAutoInitDb()) {
                throw new Error('Database chưa tồn tại. Hãy tạo DB thủ công hoặc bật AUTO_INIT_DB=true cho lần khởi tạo đầu tiên.');
            }

            await adminConnection.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\``);
        }

        await adminConnection.changeUser({ database: dbConfig.DB });

        const schemaReady = await hasCoreSchema(adminConnection);
        if (!schemaReady) {
            if (!shouldAutoInitDb()) {
                throw new Error('Schema cốt lõi chưa sẵn sàng. Hãy import database/create_database.sql trước khi deploy.');
            }

            await executeSqlFile(adminConnection, { skipDatabaseStatements: true });
            console.log('Đã khởi tạo schema và dữ liệu mẫu từ create_database.sql.');
        } else {
            console.log('Đã phát hiện schema hiện có, bỏ qua bước seed dữ liệu mẫu.');
        }

        await ensurePasswordResetTable(adminConnection);
    } finally {
        await adminConnection.end();
    }
}

/**
 * Tạo pool kết nối MySQL.
 * @returns {any}
 */
function createDbPool() {
    return mysql.createPool({
        host: dbConfig.HOST,
        user: dbConfig.USER,
        password: dbConfig.PASSWORD,
        database: dbConfig.DB,
        port: dbConfig.PORT,
        ssl: dbConfig.SSL,
        enableKeepAlive: true,
        waitForConnections: true,
        connectionLimit: dbConfig.pool.max,
        queueLimit: 0
    });
}

/**
 * Kiểm tra pool có kết nối được hay không.
 * @param {any} pool
 */
async function verifyPoolConnection(pool) {
    const connection = await pool.getConnection();
    try {
        console.log(`Đã kết nối thành công đến MySQL với ID ${connection.threadId}`);
    } finally {
        connection.release();
    }
}

/**
 * Cấu hình middleware và routes.
 * @param {any} pool
 */
function configureApp(pool) {
    if (shouldTrustProxy()) {
        app.set('trust proxy', 1);
    }

    const sessionStoreOptions = {
        clearExpired: true,
        checkExpirationInterval: 900000,
        expiration: 24 * 60 * 60 * 1000,
        createDatabaseTable: true,
        endConnectionOnClose: false,
        schema: {
            tableName: 'sessions',
            columnNames: {
                session_id: 'session_id',
                expires: 'expires',
                data: 'data'
            }
        }
    };

    // Reuse the application's TLS-enabled pool so the session store does not
    // create a second insecure MySQL connection.
    const sessionStore = new MySQLStore(sessionStoreOptions, pool);

    app.use(session({
        name: process.env.SESSION_COOKIE_NAME || 'connect.sid',
        secret: getSessionSecret(),
        store: sessionStore,
        proxy: shouldTrustProxy(),
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: isProduction,
            httpOnly: true,
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000
        }
    }));

    app.use((req, res, next) => {
        req.db = pool;
        next();
    });

    app.engine('hbs', engine({
        extname: '.hbs',
        defaultLayout: 'main',
        layoutsDir: path.join(__dirname, 'views/layouts'),
        partialsDir: path.join(__dirname, 'views/partials')
    }));
    app.set('view engine', 'hbs');
    app.set('views', path.join(__dirname, 'views'));

    app.use(express.static(path.join(__dirname, 'public')));
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());
    app.get('/healthz', (req, res) => {
        res.status(200).json({ status: 'ok' });
    });

    app.use((req, res, next) => {
        const start = Date.now();
        res.on('finish', () => {
            const logLine = `${new Date().toISOString()} ${req.method} ${req.originalUrl} ${res.statusCode} ${req.ip} ${req.headers['user-agent'] || ''} ${Date.now() - start}ms\n`;
            fs.appendFile(accessLogPath, logLine, (err) => {
                if (err) {
                    console.error('Ghi log thất bại:', err);
                }
            });
        });
        next();
    });

    app.use('/', mainRouter);
    app.use('/', authRouter);
    app.use('/chat', chatRouter);
    app.use('/admin', adminCoursesRouter);

    app.use((err, req, res, next) => {
        const logLine = `${new Date().toISOString()} ${req.method} ${req.originalUrl} ${res.statusCode} ${req.ip} ${req.headers['user-agent'] || ''} ${err.message} ${err.stack || ''}\n`;
        fs.appendFile(errorLogPath, logLine, (error) => {
            if (error) {
                console.error('Ghi log lỗi thất bại:', error);
            }
        });
        next(err);
    });
}

async function initializePoolWithRetries() {
    const maxAttempts = getStartupRetryAttempts();
    const retryDelayMs = getStartupRetryDelayMs();
    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
            await ensureDatabaseReady();
            const pool = createDbPool();
            await verifyPoolConnection(pool);
            return pool;
        } catch (error) {
            lastError = error;
            console.error(`Khởi động DB thất bại ở lần thử ${attempt}/${maxAttempts}:`, error.message);

            if (attempt < maxAttempts) {
                await sleep(retryDelayMs);
            }
        }
    }

    throw lastError;
}

async function startServer() {
    try {
        const pool = await initializePoolWithRetries();
        configureApp(pool);

        app.listen(port, () => {
            console.log(`Server đang chạy tại http://localhost:${port}`);
        });
    } catch (error) {
        console.error('Không thể khởi động server:', error);
        process.exit(1);
    }
}

startServer();
