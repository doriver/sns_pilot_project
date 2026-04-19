const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');
const User = require('../models/User');
const ChatRoom = require('../models/ChatRoom');
const ChatMessage = require('../models/ChatMessage');
const ChatParticipation = require('../models/ChatParticipation');

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
        const participation = await ChatParticipation.create({
          room: roomId,
          user: socket.user._id,
        });
        socket.participationId = participation._id;
        socket.join(roomId);
        socket.currentRoom = roomId;

        const history = await ChatMessage.find({ room: roomId })
          .sort({ createdAt: -1 })
          .limit(50)
          .populate('user', 'nickname profileImage');
        socket.emit('history', history.reverse().map((m) => ({
          _id: m._id,
          user: m.user,
          text: m.text,
          at: m.createdAt,
        })));

        const updated = await ChatRoom.findById(roomId).populate('participants', 'nickname profileImage');
        nsp.to(roomId).emit('participants', updated.participants);
        nsp.to(roomId).emit('system', { text: `${socket.user.nickname} 입장` });
        cb?.({ ok: true });
      } catch (err) {
        cb?.({ error: err.message });
      }
    });

    socket.on('message', async ({ text }, cb) => {
      if (!socket.currentRoom || !text?.trim()) return cb?.({ error: 'invalid' });
      try {
        const doc = await ChatMessage.create({
          room: socket.currentRoom,
          user: socket.user._id,
          text: text.trim(),
        });
        nsp.to(socket.currentRoom).emit('message', {
          _id: doc._id,
          user: {
            _id: socket.user._id,
            nickname: socket.user.nickname,
            profileImage: socket.user.profileImage,
          },
          text: doc.text,
          at: doc.createdAt,
        });
        cb?.({ ok: true });
      } catch (err) {
        cb?.({ error: err.message });
      }
    });

    const leave = async (reason = 'disconnect') => {
      const roomId = socket.currentRoom;
      if (!roomId) return;
      await ChatRoom.updateOne({ _id: roomId }, { $pull: { participants: socket.user._id } });
      if (socket.participationId) {
        await ChatParticipation.updateOne(
          { _id: socket.participationId, leftAt: null },
          { $set: { leftAt: new Date(), leaveReason: reason } }
        );
        socket.participationId = null;
      }
      const updated = await ChatRoom.findById(roomId).populate('participants', 'nickname profileImage');
      if (updated) nsp.to(roomId).emit('participants', updated.participants);
      nsp.to(roomId).emit('system', { text: `${socket.user.nickname} 퇴장` });
      socket.leave(roomId);
      socket.currentRoom = null;
    };

    socket.on('leave', () => leave('leave'));
    socket.on('disconnect', () => leave('disconnect'));

    socket.on('close', async ({ roomId }, cb) => {
      try {
        const room = await ChatRoom.findById(roomId);
        if (!room) return cb?.({ error: 'Room not found' });
        if (String(room.owner) !== String(socket.user._id)) return cb?.({ error: 'Forbidden' });
        room.isClosed = true;
        room.closedAt = new Date();
        await room.save();
        await ChatParticipation.updateMany(
          { room: roomId, leftAt: null },
          { $set: { leftAt: new Date(), leaveReason: 'closed' } }
        );
        nsp.to(roomId).emit('closed');
        cb?.({ ok: true });
      } catch (err) {
        cb?.({ error: err.message });
      }
    });
  });
}

module.exports = { initChatSocket };
