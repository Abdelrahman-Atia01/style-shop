import 'dotenv/config';
import express from 'express';
import cors    from 'cors';
import path    from 'path';
import { fileURLToPath } from 'url';
import connectDB from './src/DB/connection.js';

// Routers
import authRouter         from './src/modules/Auth/auth.router.js';
import productRouter      from './src/modules/product/product.router.js';
import orderRouter        from './src/modules/order/order.router.js';
import customerRouter     from './src/modules/customer/customer.router.js';
import supplierRouter     from './src/modules/supplier/supplier.router.js';
import employeeRouter     from './src/modules/employee/employee.router.js';
import reportRouter       from './src/modules/report/report.router.js';
import returnRouter       from './src/modules/return/return.router.js';
import notificationRouter from './src/modules/notification/notification.router.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app  = express();
const PORT = process.env.PORT || 44000;

// ── Connect DB ─────────────────────────────────────────────
await connectDB();

// ── Middleware ─────────────────────────────────────────────
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'frontend/public')));

// ── API Routes ─────────────────────────────────────────────
app.use('/api/auth',          authRouter);
app.use('/api/products',      productRouter);
app.use('/api/orders',        orderRouter);
app.use('/api/customers',     customerRouter);
app.use('/api/suppliers',     supplierRouter);
app.use('/api/employees',     employeeRouter);
app.use('/api/reports',       reportRouter);
app.use('/api/returns',       returnRouter);
app.use('/api/notifications', notificationRouter);

// ── Serve frontend SPA ─────────────────────────────────────
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/public/index.html'));
});

// ── Global error handler ───────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Style Shop running on http://localhost:${PORT}`);
  console.log(`📊 API: http://localhost:${PORT}/api`);
});
