const ChatRoom = require('../models/ChatRoom');

exports.list = async (req, res, next) => {
  try {
    const rooms = await ChatRoom.find({ isClosed: false })
      .sort({ createdAt: -1 })
      .populate('owner', 'nickname profileImage');
    res.json(
      rooms.map((r) => ({
        _id: r._id,
        name: r.name,
        owner: r.owner,
        maxUsers: r.maxUsers,
        currentUsers: r.participants.length,
        isClosed: r.isClosed,
        createdAt: r.createdAt,
      }))
    );
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { name, maxUsers } = req.body;
    if (!name || !maxUsers) return res.status(400).json({ message: 'name, maxUsers required' });
    const room = await ChatRoom.create({
      name,
      maxUsers: Number(maxUsers),
      owner: req.user._id,
      participants: [],
    });
    res.status(201).json(room);
  } catch (err) { next(err); }
};

exports.close = async (req, res, next) => {
  try {
    const room = await ChatRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    if (String(room.owner) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Only owner can close' });
    }
    room.isClosed = true;
    room.closedAt = new Date();
    await room.save();
    res.json(room);
  } catch (err) { next(err); }
};

exports.detail = async (req, res, next) => {
  try {
    const room = await ChatRoom.findById(req.params.id)
      .populate('owner', 'nickname')
      .populate('participants', 'nickname profileImage');
    if (!room) return res.status(404).json({ message: 'Room not found' });
    res.json(room);
  } catch (err) { next(err); }
};
