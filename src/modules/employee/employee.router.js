import { Router } from 'express';
import { getAll, getOne, create, update, resetPassword, remove } from './employee.controller.js';
import { authenticate, authorize } from '../Auth/auth.middleware.js';

const router = Router();
const mgr = [authenticate, authorize('manager')];

router.get('/',              ...mgr, getAll);
router.get('/:id',           ...mgr, getOne);
router.post('/',             ...mgr, create);
router.put('/:id',           ...mgr, update);
router.patch('/:id/password',...mgr, resetPassword);
router.delete('/:id',        ...mgr, remove);

export default router;
