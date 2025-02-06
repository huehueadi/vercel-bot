import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import connectDB from './src/config/db.js';
import router from './src/routes/chatRoutes.js';
// import { cleanupInactiveSessions } from './src/services/authSessionCleanup.js';
import cookieParser from 'cookie-parser';

const app = express();

// Middleware

const corsOptions = {
  origin: [
    'http://127.0.0.1:5502', 
    'https://staging.d28eyjz01qa62a.amplifyapp.com',
    'http://localhost:3000',   // Allow localhost:3000
    'http://localhost:3001',   // Allow localhost:3001
  ],
  credentials: true,           // Allow credentials like cookies, authorization headers, etc.
};

app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(cookieParser());

// Database Connection
connectDB()
// Routes
app.use('/v1', router);    // Prefix user routes with /v1/user

app.get('/',(req, res)=>{
  res.send("health")
});





const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
