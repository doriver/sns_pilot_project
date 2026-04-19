const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatRoom', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
  },
  { timestamps: true }
);

chatMessageSchema.index({ room: 1, createdAt: -1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
