import { MAX_CONTENT_LENGTH } from '../config/upload.js';

export function validateContentLength(req, res, next) {
  const rawHeader = req.headers['content-length'];
  if (rawHeader !== undefined) {
    const contentLength = Number.parseInt(Array.isArray(rawHeader) ? rawHeader[0] : rawHeader, 10);
    if (!Number.isFinite(contentLength) || contentLength < 0 || contentLength > MAX_CONTENT_LENGTH) {
      return res.status(413).json({ error: 'Payload Too Large: Content-Length exceeds maximum allowed limit.' });
    }
  }
  next();
}
