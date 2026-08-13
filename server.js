import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'node:path';
import { validateContentLength } from './backend/middleware/validateContentLength.js';
import { runMigrations } from './backend/config/migrations.js';

import loginRoutes from './backend/routes/loginRoutes.js';
import adminDashboardRoutes from './backend/routes/adminDashboardRoutes.js';
import profileModalRoutes from './backend/routes/profileModalRoutes.js';
import projectsViewRoutes from './backend/routes/projectsViewRoutes.js';
import packageGridRoutes from './backend/routes/packageGridRoutes.js';
import createPackageModalRoutes from './backend/routes/createPackageModalRoutes.js';
import editPackageModalRoutes from './backend/routes/editPackageModalRoutes.js';
import contentDashboardRoutes from './backend/routes/contentDashboardRoutes.js';
import designDashboardRoutes from './backend/routes/designDashboardRoutes.js';
import developerDashboardRoutes from './backend/routes/developerDashboardRoutes.js';
import devopsDashboardRoutes from './backend/routes/devopsDashboardRoutes.js';
import testingDashboardRoutes from './backend/routes/testingDashboardRoutes.js';
import notificationToastRoutes from './backend/routes/notificationToastRoutes.js';
import roleHistoryViewRoutes from './backend/routes/roleHistoryViewRoutes.js';

const app = express();
app.disable('x-powered-by');
const port = process.env.PORT || 3001;

app.use(validateContentLength);

const corsOriginEnv = process.env.CORS_ORIGIN;
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    if (!corsOriginEnv || corsOriginEnv === '*' || corsOriginEnv === 'true') {
      return callback(null, true);
    }

    const allowedOrigins = corsOriginEnv.split(',').map(o => o.trim().replace(/\/+$/, ''));
    const normalizedOrigin = origin.replace(/\/+$/, '');

    if (allowedOrigins.includes(normalizedOrigin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }

    if (/^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(normalizedOrigin)) {
      return callback(null, true);
    }

    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Execute database migrations and seeds
await runMigrations();

// Mount backend route modules corresponding to frontend files
app.use(loginRoutes);
app.use(adminDashboardRoutes);
app.use(profileModalRoutes);
app.use(projectsViewRoutes);
app.use(packageGridRoutes);
app.use(createPackageModalRoutes);
app.use(editPackageModalRoutes);
app.use(contentDashboardRoutes);
app.use(designDashboardRoutes);
app.use(developerDashboardRoutes);
app.use(devopsDashboardRoutes);
app.use(testingDashboardRoutes);
app.use(notificationToastRoutes);
app.use(roleHistoryViewRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File is too large. Maximum allowed size is 500MB.' });
    }
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  } else if (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
  next();
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});