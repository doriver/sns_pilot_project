const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');
const User = require('../models/User');
const ChatRoom = require('../models/ChatRoom');

function initChatSocket(io) {
  const nsp = io.of('/chat');

  nsp.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('No token'));
      const payload = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(payload.sub).select('nickname profileImage role');
      if (!user) return next(new Error('Invalid token'));
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Unauthorized'));
    }
  });

  nsp.on('connection', (socket) => {
    socket.on('join', async ({ roomId }, cb) => {
      try {
        const room = await ChatRoom.findById(roomId);
        if (!room) return cb?.({ error: 'Room not found' });
        if (room.isClosed) return cb?.({ error: 'Room closed' });
        if (room.participants.length >= room.maxUsers
            && !room.participants.some((p) => String(p) === String(socket.user._id))) {
          return cb?.({ error: 'Room full' });
        }
        await ChatRoom.updateOne(
          { _id: roomId },
          { $addToSet: { participants: socket.user._id } }
        );
        socket.join(roomId);
        socket.currentRoom = roomId;
        const updated = await ChatRoom.findById(roomId).populate('participants', 'nickname profileImage');
        nsp.to(roomId).emit('participants', updated.participants);
        nsp.to(roomId).emit('system', { text: `${socket.user.nickname} 입장` });
        cb?.({ ok: true });
      } catch (err) {
        cb?.({ error: err.message });
      }
    });

    socket.on('message', ({ text }) => {
      if (!socket.currentRoom || !text) return;
      nsp.to(socket.currentRoom).emit('message', {
        user: { _id: socket.user._id, nickname: socket.user.nickname, profileImage: socket.user.profileImage },
        text,
        at: new Date(),
      });
    });

    const leave = async () => {
      const roomId = socket.currentRoom;
      if (!roomId) return;
      await ChatRoom.updateOne({ _id: roomId }, { $pull: { participants: socket.user._id } });
      const updated = await ChatRoom.findById(roomId).populate('participants', 'nickname profileImage');
      if (updated) nsp.to(roomId).emit('participants', updated.participants);
      nsp.to(roomId).emit('system', { text: `${socket.user.nickname} 퇴장` });
      socket.leave(roomId);
      socket.currentRoom = null;
    };

    socket.on('leave', leave);
    socket.on('disconnect', leave);

    socket.on('close', async ({ roomId }, cb) => {
      try {
        const room = await ChatRoom.findById(roomId);
        if (!room) return cb?.({ error: 'Room not found' });
        if (String(room.owner) !== String(socket.user._id)) return cb?.({ error: 'Forbidden' });
        room.isClosed = true;
        room.closedAt = new Date();
        await room.save();
        nsp.to(roomId).emit('closed');
        cb?.({ ok: true });
      } catch (err) {
        cb?.({ error: err.message });
      }
    });
  });
}

module.exports = { initChatSocket };
