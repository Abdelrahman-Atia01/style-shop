import { Router } from 'express';
import { getAll, getOne, create, update } from './customer.controller.js';
import { authenticate, authorize } from '../Auth/auth.middleware.js';

const router = Router();

// cashier and manager can manage customers
router.get('/',    authenticate, authorize('manager','cashier'), getAll);
router.get('/:id', authenticate, authorize('manager','cashier'), getOne);
router.post('/',   authenticate, authorize('manager','cashier'), create);
router.put('/:id', authenticate, authorize('manager','cashier'), update);

export default router;
