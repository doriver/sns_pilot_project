const mongoose = require('mongoose');

const chatParticipationSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatRoom', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    joinedAt: { type: Date, default: Date.now },
    leftAt: { type: Date, default: null },
    leaveReason: {
      type: String,
      enum: ['leave', 'disconnect', 'closed', null],
      default: null,
    },
  },
  { timestamps: true }
);

chatParticipationSchema.index({ room: 1, joinedAt: -1 });
chatParticipationSchema.index({ room: 1, user: 1, leftAt: 1 });

module.exports = mongoose.model('ChatParticipation', chatParticipationSchema);
