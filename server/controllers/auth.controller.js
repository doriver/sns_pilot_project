const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/env');

exports.signup = async (req, res, next) => {
  try {
    const { email, password, nickname } = req.body;
    if (!email || !password || !nickname) {
      return res.status(400).json({ message: 'email, password, nickname required' });
    }
    const exists = await User.findOne({ $or: [{ email }, { nickname }] });
    if (exists) return res.status(409).json({ message: 'email or nickname already used' });
    const passwordHash = await bcrypt.hash(password, 10);
    const profileImage = req.file ? `/uploads/${req.file.filename}` : '';
    const user = await User.create({ email, passwordHash, nickname, profileImage });
    res.status(201).json(user.toPublic());
  } catch (err) { next(err); }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ sub: user._id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    res.json({ token, user: user.toPublic() });
  } catch (err) { next(err); }
};

exports.me = async (req, res) => {
  res.json(req.user.toPublic ? req.user.toPublic() : req.user);
};
