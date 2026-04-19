const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    nickname: { type: String, required: true, unique: true, trim: true },
    profileImage: { type: String, default: '' },
    role: { type: String, enum: ['user', 'influencer', 'admin'], default: 'user' },
  },
  { timestamps: true }
);

userSchema.methods.toPublic = function () {
  return {
    _id: this._id,
    email: this.email,
    nickname: this.nickname,
    profileImage: this.profileImage,
    role: this.role,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
