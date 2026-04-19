const router = require('express').Router();
const ctrl = require('../controllers/user.controller');
const { auth, requireRole } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

router.patch('/me', auth, upload.single('profileImage'), ctrl.updateMe);
router.patch('/:id/role', auth, requireRole('admin'), ctrl.changeRole);

module.exports = router;
