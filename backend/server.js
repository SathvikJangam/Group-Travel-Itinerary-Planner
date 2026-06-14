import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http'; // Required for socket.io
import { Server } from 'socket.io';
import connectDB from './config/db.js';

// Route Imports
import authRoutes from './routes/authRoutes.js';
import tripRoutes from './routes/tripRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import packageRoutes from './routes/packageRoutes.js';

// Socket Handler
import { handleSockets } from "./sockets/socketHandler.js";

dotenv.config();
const app = express();

// 1. Create HTTP Server from Express app
const httpServer = http.createServer(app);

// 2. Initialize Socket.io
const io = new Server(httpServer, {
  cors: { 
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// 3. Inject 'io' into request object so controllers can use it
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Mount the API Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/packages', packageRoutes);

// Initialize Socket logic
handleSockets(io);

// 4. Connect to DB and Start the HTTP Server (NOT app.listen)
const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  httpServer.listen(PORT, () => console.log(`🚀 Server & Socket.io running on port ${PORT}`));
});