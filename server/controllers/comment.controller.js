const Comment = require('../models/Comment');

exports.list = async (req, res, next) => {
  try {
    const comments = await Comment.find({ post: req.params.postId })
      .sort({ createdAt: 1 })
      .populate('author', 'nickname profileImage');
    res.json(comments);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ message: 'content required' });
    const comment = await Comment.create({
      post: req.params.postId,
      author: req.user._id,
      content,
    });
    await comment.populate('author', 'nickname profileImage');
    res.status(201).json(comment);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    if (String(comment.author) !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    await comment.deleteOne();
    res.json({ ok: true });
  } catch (err) { next(err); }
};
