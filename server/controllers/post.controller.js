const Post = require('../models/Post');
const Comment = require('../models/Comment');

exports.timeline = async (req, res, next) => {
  try {
    const posts = await Post.find()
      .sort({ viewCount: -1, createdAt: -1 })
      .limit(10)
      .populate('author', 'nickname profileImage')
      .lean();
    const ids = posts.map((p) => p._id);
    const comments = await Comment.find({ post: { $in: ids } })
      .sort({ createdAt: -1 })
      .populate('author', 'nickname profileImage')
      .lean();
    const byPost = new Map();
    const countByPost = new Map();
    for (const c of comments) {
      const key = String(c.post);
      countByPost.set(key, (countByPost.get(key) || 0) + 1);
      const arr = byPost.get(key) || [];
      if (arr.length < 3) arr.push(c);
      byPost.set(key, arr);
    }
    for (const p of posts) {
      const key = String(p._id);
      p.comments = (byPost.get(key) || []).slice().reverse();
      p.commentCount = countByPost.get(key) || 0;
    }
    res.json(posts);
  } catch (err) { next(err); }
};

exports.list = async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const [items, total] = await Promise.all([
      Post.find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('author', 'nickname profileImage'),
      Post.countDocuments(),
    ]);
    res.json({ items, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
};

exports.detail = async (req, res, next) => {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { $inc: { viewCount: 1 } },
      { new: true }
    ).populate('author', 'nickname profileImage');
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json(post);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { title, content } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ message: 'title required' });
    if (!content) return res.status(400).json({ message: 'content required' });
    const images = (req.files || []).map((f) => `/uploads/${f.filename}`);
    const post = await Post.create({ author: req.user._id, title: title.trim(), content, images });
    res.status(201).json(post);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (String(post.author) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (typeof req.body.title === 'string' && req.body.title.trim()) post.title = req.body.title.trim();
    if (typeof req.body.content === 'string') post.content = req.body.content;
    await post.save();
    res.json(post);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (String(post.author) !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    await Promise.all([post.deleteOne(), Comment.deleteMany({ post: post._id })]);
    res.json({ ok: true });
  } catch (err) { next(err); }
};

exports.like = async (req, res, next) => {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { likeUsers: req.user._id } },
      { new: true }
    );
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json({ likes: post.likeUsers.length });
  } catch (err) { next(err); }
};

exports.unlike = async (req, res, next) => {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { $pull: { likeUsers: req.user._id } },
      { new: true }
    );
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json({ likes: post.likeUsers.length });
  } catch (err) { next(err); }
};
