import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import path from 'path';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { logger } from './config/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiRouter } from './routes';
import { openApiDocument } from './docs/openapi';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true
    })
  );
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false
    })
  );
  app.use(compression());
  app.use(express.json({ limit: `${env.MAX_FILE_SIZE_MB}mb` }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(
    morgan('combined', {
      stream: {
        write: (message) => logger.info(message.trim())
      }
    })
  );
  app.use('/storage', express.static(path.resolve(env.STORAGE_DIR)));

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
  app.use('/api/v1', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
