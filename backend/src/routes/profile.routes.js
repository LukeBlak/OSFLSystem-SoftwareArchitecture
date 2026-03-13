// En profile.routes.js
import { upload } from '../middleware/upload.middleware.js';

router.post('/avatar', upload.single('avatar'), profileController.uploadAvatar);