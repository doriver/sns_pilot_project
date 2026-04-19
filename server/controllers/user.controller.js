const User = require('../models/User');

exports.updateMe = async (req, res, next) => {
  try {
    const { nickname } = req.body;
    const update = {};
    if (nickname) update.nickname = nickname;
    if (req.file) update.profileImage = `/uploads/${req.file.filename}`;
    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true });
    res.json(user.toPublic());
  } catch (err) { next(err); }
};

exports.changeRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['user', 'influencer', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'invalid role' });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user.toPublic());
  } catch (err) { next(err); }
};
