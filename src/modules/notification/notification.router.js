import { Router } from 'express';
import { getMyNotifications, markRead, markAllRead } from './notification.controller.js';
import { authenticate } from '../Auth/auth.middleware.js';

const router = Router();

router.get('/',                authenticate, getMyNotifications);
router.patch('/read-all',      authenticate, markAllRead);
router.patch('/:id/read',      authenticate, markRead);

export default router;
