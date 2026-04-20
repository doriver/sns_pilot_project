const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    content: { type: String, required: true },
    images: [{ type: String }],
    viewCount: { type: Number, default: 0 },
    likeUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

postSchema.index({ createdAt: -1 });
postSchema.index({ viewCount: -1, createdAt: -1 });

module.exports = mongoose.model('Post', postSchema);
