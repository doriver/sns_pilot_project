const router = require('express').Router();
const ctrl = require('../controllers/chat.controller');
const { auth, requireRole } = require('../middlewares/auth');

router.get('/', ctrl.list);
router.get('/:id/messages', auth, ctrl.messages);
router.get('/:id/participations', auth, ctrl.participations);
router.get('/:id', ctrl.detail);
router.post('/', auth, requireRole('influencer', 'admin'), ctrl.create);
router.patch('/:id/close', auth, ctrl.close);

module.exports = router;
