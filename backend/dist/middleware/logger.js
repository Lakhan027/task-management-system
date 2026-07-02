export const logger = (req, res, next) => {
    const start = Date.now();
    // Log on response finish
    res.on('finish', () => {
        const duration = Date.now() - start;
        const status = res.statusCode;
        const method = req.method;
        const url = req.originalUrl || req.url;
        const color = status >= 400 ? '\x1b[31m' : status >= 300 ? '\x1b[33m' : '\x1b[32m';
        const reset = '\x1b[0m';
        console.log(`${color}${status}${reset} ${method} ${url} ${duration}ms`);
    });
    next();
};
export const morganLog = (req, res, next) => {
    console.log(`📝 ${req.method} ${req.originalUrl || req.url}`);
    next();
};
