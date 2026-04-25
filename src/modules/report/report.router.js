import { Router } from 'express';
import { getDashboard, getSalesReport, getInventoryReport, getBestSellers } from './report.controller.js';
import { authenticate, authorize } from '../Auth/auth.middleware.js';

const router = Router();

router.get('/dashboard',    authenticate, getDashboard);
router.get('/sales',        authenticate, authorize('manager'), getSalesReport);
router.get('/inventory',    authenticate, authorize('manager','stock_clerk'), getInventoryReport);
router.get('/best-sellers', authenticate, getBestSellers);

export default router;
