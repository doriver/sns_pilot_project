const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const { PORT } = require('./config/env');
const { connectDB } = require('./config/db');
const { notFound, errorHandler } = require('./middlewares/error');
const { initChatSocket } = require('./sockets/chat');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/posts', require('./routes/post.routes'));
app.use('/api/chat-rooms', require('./routes/chat.routes'));

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api', notFound);
app.use(errorHandler);

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
initChatSocket(io);

(async () => {
  try {
    await connectDB();
    server.listen(PORT, () => console.log(`[server] http://localhost:${PORT}`));
  } catch (err) {
    console.error('[fatal] failed to start', err);
    process.exit(1);
  }
})();
