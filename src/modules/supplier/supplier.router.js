import { Router } from 'express';
import { getAll, getOne, create, update, remove } from './supplier.controller.js';
import { authenticate, authorize } from '../Auth/auth.middleware.js';

const router = Router();

// Everyone logged in can view suppliers (needed for product dropdowns)
router.get('/',    authenticate, getAll);
router.get('/:id', authenticate, getOne);

// Only manager can create/edit/delete
router.post('/',       authenticate, authorize('manager'), create);
router.put('/:id',     authenticate, authorize('manager'), update);
router.delete('/:id',  authenticate, authorize('manager'), remove);

export default router;
