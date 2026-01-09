const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Serve PDF files statically
app.use('/pdfs', express.static(path.join(__dirname, '../pdfs')));

// Routes
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/auth.routes');
const eventRoutes = require('./routes/event.routes');
const inviteRoutes = require('./routes/invite.routes');
const uploadRoutes = require('./routes/upload.routes');
const albumRoutes = require('./routes/album.routes');
const printOrderRoutes = require('./routes/printOrder.routes');

app.use('/health', healthRoutes);
app.use('/auth', authRoutes);
app.use('/events', eventRoutes);
app.use('/', inviteRoutes);
app.use('/', uploadRoutes);
app.use('/', albumRoutes);
app.use('/', printOrderRoutes);

module.exports = app;
