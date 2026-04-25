import { Router } from 'express';
import { getAll, create } from './return.controller.js';
import { authenticate, authorize } from '../Auth/auth.middleware.js';

const router = Router();

router.get('/',  authenticate, authorize('manager','cashier'), getAll);
router.post('/', authenticate, authorize('manager','cashier'), create);

export default router;
