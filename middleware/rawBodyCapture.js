/**
 * Middleware to capture the raw body of a request.
 * This is needed for webhook signature verification.
 */
export const rawBodyCapture = (req, res, next) => {
    // Use an array to collect chunks as Buffer objects
    const chunks = [];

    req.on('data', chunk => {
        // Store chunks as they come without converting to string
        chunks.push(chunk);
    });

    req.on('end', () => {
        // Combine all chunks into a single Buffer
        const buffer = Buffer.concat(chunks);

        // Store both buffer and string versions
        req.rawBody = buffer;
        req.rawBodyText = buffer.toString('utf8');

        // If content-type is JSON, parse it for regular middleware
        if (req.headers['content-type'] === 'application/json') {
            try {
                req.body = JSON.parse(buffer.toString('utf8'));
            } catch (err) {
                console.error('Error parsing JSON body:', err);
                // Continue even if JSON parsing fails
            }
        }

        next();
    });

    req.on('error', err => {
        console.error('Error capturing raw body:', err);
        next(err);
    });
}; 