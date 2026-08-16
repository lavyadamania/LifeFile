require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { initKafka } = require('./services/kafka');

const app = express();
const server = http.createServer(app);

// Socket.io
const io = new Server(server, {
  cors: { origin: ['http://localhost:5173', 'http://localhost:5174'], credentials: true },
});

io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// Middleware
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174'], credentials: true }));
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

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', kafka: true, mongo: true }));

// Connect to MongoDB, Kafka, then start server
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    // Initialize Kafka (runs asynchronously with connection manager)
    initKafka(io);

    server.listen(PORT, () => {
      console.log(`🚀 SCOS Backend running on http://localhost:${PORT}`);
      console.log(`📡 Socket.io ready for real-time events`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
