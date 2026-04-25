import { Router } from 'express';
import { login, getProfile } from './auth.controller.js';
import { authenticate } from './auth.middleware.js';

const router = Router();

router.post('/login',   login);
router.get('/profile',  authenticate, getProfile);

export default router;
