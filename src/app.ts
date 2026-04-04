import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import { apiLimiter } from './middlewares/rateLimiter';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import router from './routes/index';

const app = express();

// Security Headers
app.use(helmet());

// CORS 
app.use(
    cors({
        origin: process.env.ALLOWED_ORIGINS?.split('.') ?? '*',
        methods: ['GET','POST','PATCH','DELETE'],
        allowedHeaders: ['Content-Type','Authorization'], 
    })
);

// Request logging
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
}

// Body Parsing Middleware
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api', apiLimiter);

app.use('/api', router);

// API docs
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(notFoundHandler);

app.use(errorHandler);


export default app;



