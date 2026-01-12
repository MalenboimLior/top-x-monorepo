import * as functions from 'firebase-functions/v2';
import axios from 'axios';

// Simple in-memory cache for search results
const searchCache = new Map<string, { data: any; timestamp: number }>();
const searchTTL = 5 * 60 * 1000; // 5 minutes

// Cache for proxied images (URL -> buffer data)
const imageCache = new Map<string, { buffer: Buffer; contentType: string; timestamp: number }>();
const imageTTL = 24 * 60 * 60 * 1000; // 24 hours

export const searchBooks = functions.https.onRequest({ cors: true }, async (req, res) => {
    console.log('searchBooks function triggered');

    try {
        const apiKey = process.env.GOOGLE_BOOKS_API_KEY;

        if (!apiKey) {
            console.error('GOOGLE_BOOKS_API_KEY not found in process.env');
            res.status(500).json({
                error: 'API Key configuration missing',
                details: 'GOOGLE_BOOKS_API_KEY is not defined in the environment'
            });
            return;
        }

        const q = req.query.q as string;
        const maxResults = parseInt(req.query.maxResults as string) || 10;

        console.log(`SearchBooks parameters: q="${q}", maxResults=${maxResults}`);

        if (!q || q.trim().length < 3) {
            res.json({ items: [] });
            return;
        }

        const normalizedQ = q.trim().toLowerCase();
        const cacheKey = `${normalizedQ}_${maxResults}`;
        const cached = searchCache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < searchTTL) {
            console.log(`Returning cached results for: ${cacheKey}`);
            res.json(cached.data);
            return;
        }

        console.log(`Fetching from Google Books API for: ${normalizedQ}`);
        const response = await axios.get(`https://www.googleapis.com/books/v1/volumes`, {
            params: {
                q: normalizedQ,
                maxResults,
                key: apiKey,
            },
            headers: {
                'Referer': 'https://top-x.co',
            }
        });

        console.log('Google Books API response received');
        searchCache.set(cacheKey, { data: response.data, timestamp: Date.now() });
        res.json(response.data);
    } catch (error: any) {
        console.error('Error in searchBooks handler:', error?.response?.data || error.message);
        res.status(500).json({
            error: 'Internal function error',
            message: error.message,
            stack: error.stack,
            details: error?.response?.data || 'No additional details'
        });
    }
});

/**
 * Proxies book cover images to avoid CORS issues
 * Fetches the image from Google Books API and returns it with proper CORS headers
 */
export const proxyBookImage = functions.https.onRequest({ cors: true }, async (req, res) => {
    try {
        const imageUrl = req.query.url as string;

        if (!imageUrl) {
            res.status(400).json({ error: 'Missing url parameter' });
            return;
        }

        // Validate that it's a Google Books URL for security
        if (!imageUrl.includes('books.google.com')) {
            res.status(400).json({ error: 'Invalid image URL' });
            return;
        }

        // Check cache first
        const cached = imageCache.get(imageUrl);
        if (cached && Date.now() - cached.timestamp < imageTTL) {
            console.log(`Returning cached image: ${imageUrl}`);
            res.set('Content-Type', cached.contentType);
            res.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
            res.send(cached.buffer);
            return;
        }

        console.log(`Proxying book image: ${imageUrl}`);

        // Fetch the image
        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            headers: {
                'Referer': 'https://top-x.co',
            },
        });

        // Determine content type from response headers or default to image/jpeg
        const contentType = response.headers['content-type'] || 'image/jpeg';
        const imageBuffer = Buffer.from(response.data);

        // Cache the image
        imageCache.set(imageUrl, {
            buffer: imageBuffer,
            contentType,
            timestamp: Date.now(),
        });

        // Set headers (CORS is handled by { cors: true } in function definition)
        res.set('Content-Type', contentType);
        res.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year

        // Send the image data
        res.send(imageBuffer);
    } catch (error: any) {
        console.error('Error proxying book image:', error?.message);
        res.status(500).json({
            error: 'Failed to proxy image',
            message: error.message,
        });
    }
});
