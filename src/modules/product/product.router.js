import { Router } from 'express';
import { getAll, getOne, create, update, remove, getLowStock } from './product.controller.js';
import { authenticate, authorize } from '../Auth/auth.middleware.js';

const router = Router();
const inv = [authenticate, authorize('manager', 'stock_clerk')];
const mgr = [authenticate, authorize('manager')];

// Everyone logged in can READ products (needed for sale modal)
router.get('/low-stock',  authenticate, getLowStock);
router.get('/',           authenticate, getAll);
router.get('/:id',        authenticate, getOne);

// Only manager + stock_clerk can mutate
router.post('/',       ...inv, create);
router.put('/:id',     ...inv, update);
router.delete('/:id',  ...mgr, remove);

export default router;
