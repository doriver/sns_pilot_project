const router = require('express').Router();
const ctrl = require('../controllers/post.controller');
const commentCtrl = require('../controllers/comment.controller');
const { auth } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

router.get('/timeline', ctrl.timeline);
router.get('/', ctrl.list);
router.get('/:id', ctrl.detail);
router.post('/', auth, upload.array('images', 5), ctrl.create);
router.patch('/:id', auth, ctrl.update);
router.delete('/:id', auth, ctrl.remove);
router.post('/:id/like', auth, ctrl.like);
router.delete('/:id/like', auth, ctrl.unlike);

router.get('/:postId/comments', commentCtrl.list);
router.post('/:postId/comments', auth, commentCtrl.create);
router.delete('/:postId/comments/:commentId', auth, commentCtrl.remove);

module.exports = router;
