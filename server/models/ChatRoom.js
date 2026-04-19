const mongoose = require('mongoose');

const chatRoomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    maxUsers: { type: Number, required: true, min: 2, max: 500 },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isClosed: { type: Boolean, default: false },
    closedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ChatRoom', chatRoomSchema);
