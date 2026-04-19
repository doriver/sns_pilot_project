const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const { auth } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

router.post('/signup', upload.single('profileImage'), ctrl.signup);
router.post('/login', ctrl.login);
router.get('/me', auth, ctrl.me);

module.exports = router;
