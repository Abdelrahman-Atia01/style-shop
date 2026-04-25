import { Router } from 'express';
import { getAll, getOne, create, updateStatus } from './order.controller.js';
import { authenticate, authorize } from '../Auth/auth.middleware.js';

const router = Router();

router.get('/',              authenticate, authorize('manager','cashier','stock_clerk'), getAll);
router.get('/:id',           authenticate, authorize('manager','cashier','stock_clerk'), getOne);
router.post('/',             authenticate, authorize('manager','cashier'), create);
router.patch('/:id/status',  authenticate, authorize('manager','cashier'), updateStatus);

export default router;
