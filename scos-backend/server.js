require('dotenv').config(); // LifeFile Server Entrypoint - Gemini 3.6 Fix
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { initKafka, disconnectKafka } = require('./services/kafka');

const app = express();
const server = http.createServer(app);

// Socket.io
const io = new Server(server, {
  cors: { origin: true, credentials: true },
});

io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Serve uploaded files (signatures, attachments)
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/doctors', require('./routes/doctors'));
app.use('/api/clinics', require('./routes/clinics'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/prescriptions', require('./routes/prescriptions'));
app.use('/api/audit-logs', require('./routes/auditLogs'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/queue', require('./routes/queue'));
app.use('/api/hospitals', require('./routes/hospitals'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/memory', require('./routes/memory'));
app.use('/api/benchmark', require('./routes/benchmark'));
// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', kafka: true, mongo: true }));

// Graceful Shutdown Handler
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Gracefully shutting down SCOS backend...`);
  await disconnectKafka();
  server.close(() => {
    mongoose.connection.close(false, () => {
      console.log('✅ Server and MongoDB connections closed.');
      process.exit(0);
    });
  });
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.once('SIGUSR2', async () => {
  await disconnectKafka();
  process.kill(process.pid, 'SIGUSR2');
});

// Connect to MongoDB, Kafka, then start server
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    // Initialize Kafka (runs asynchronously with connection manager)
    initKafka(io);

    server.listen(PORT, () => {
      console.log(`🚀 LifeFile Backend running on http://localhost:${PORT}`);
      console.log(`📡 Socket.io ready for real-time events`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
