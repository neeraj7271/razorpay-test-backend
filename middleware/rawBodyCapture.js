/**
 * Middleware to capture the raw body of a request.
 * This is needed for webhook signature verification.
 */
export const rawBodyCapture = (req, res, next) => {
    if (req.headers['content-type'] === 'application/json') {
        let data = '';
        // req.setEncoding('utf8');

        req.on('data', chunk => {
            data += chunk;
        });

        req.on('end', () => {
            req.rawBody = data;
            next();
        });

        req.on('error', err => {
            console.error('Error capturing raw body:', err);
            next(err);
        });
    } else {
        next();
    }
}; 