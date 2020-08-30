module.exports = {
    app: {
        port: process.env.PORT || 5000
    },
    database: {
        host: process.env.DB_HOST || "localhost",
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || "demo",
        password: process.env.DB_PASS || "123456",
        database: process.env.DB_NAME || "demo"
    }
};