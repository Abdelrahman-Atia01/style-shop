# 🛍️ Style Shop — Clothing Store Management System

> A production-ready full-stack management system for a kids & men's clothing store.  
> Built with **Node.js**, **Express**, **MongoDB**, and a **Vanilla JS SPA** frontend.

---

## 📸 Overview

Style Shop is a complete business management platform that handles everything from point-of-sale to inventory control, supplier relationships, and analytics — all with a **role-based access system** that dynamically changes the UI based on who's logged in.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔐 **Role-Based Access Control** | Three roles — Manager, Cashier, Stock Clerk — each with strict permissions and a dynamically rendered dashboard |
| 🛒 **Sales & Cart System** | Real-time cart, discounts, payment methods, and automatic customer creation on every sale |
| 📦 **Inventory Management** | Full product CRUD with SKU tracking, category filtering, supplier linking, and stock monitoring |
| 🔔 **Smart Notifications** | Every operation generates a notification; low stock (< 5 units) alerts sent to Manager & Stock Clerk automatically |
| 📊 **Reports & Analytics** | MongoDB aggregation pipelines for revenue trends, best sellers, category performance, and payment breakdowns |
| 🏭 **Supplier Management** | Manager-only CRUD with direct product linking |
| 👥 **Employee Management** | Manager can create, edit, deactivate employees and reset passwords |
| ⚡ **Atomic Transactions** | Mongoose sessions prevent overselling on concurrent orders |
| 🌱 **Database Seeding** | One command seeds default users, suppliers, and sample products |

---

## 🧑‍💼 Roles & Permissions

| Permission | Manager | Cashier | Stock Clerk |
|---|:---:|:---:|:---:|
| View Dashboard | ✅ | ✅ | ✅ |
| Create Orders / Sales | ✅ | ✅ | ❌ |
| Manage Inventory | ✅ | ❌ | ✅ |
| Delete Products | ✅ | ❌ | ❌ |
| Manage Suppliers | ✅ | ❌ | ❌ |
| Manage Employees | ✅ | ❌ | ❌ |
| View Reports | ✅ | ❌ | ❌ |
| Notifications (all events) | ✅ | ❌ | ❌ |
| Notifications (low stock) | ✅ | ❌ | ✅ |

---

## 🛠️ Tech Stack

**Backend**
- [Node.js](https://nodejs.org/) + [Express](https://expressjs.com/) (ES Modules)
- [MongoDB](https://www.mongodb.com/) + [Mongoose](https://mongoosejs.com/)
- [JWT](https://jwt.io/) — Authentication & Authorization
- [bcryptjs](https://github.com/dcodeIO/bcrypt.js) — Password hashing

**Frontend**
- Vanilla JavaScript (SPA — no framework)
- Chart.js — Analytics charts
- Custom CSS with CSS Variables & dark theme

---

## 📁 Project Structure

```
style-shop/
├── server.js                  # Entry point
├── .env                       # Environment variables
├── package.json
├── src/
│   ├── DB/
│   │   ├── connection.js      # MongoDB connection
│   │   ├── seed.js            # Database seeder
│   │   └── models/
│   │       ├── employee.model.js
│   │       ├── customer.model.js
│   │       ├── product.model.js
│   │       ├── supplier.model.js
│   │       ├── order.model.js
│   │       ├── return.model.js
│   │       └── notification.model.js
│   ├── modules/
│   │   ├── Auth/              # Login, JWT, middleware
│   │   ├── employee/          # Employee CRUD
│   │   ├── customer/          # Customer CRUD
│   │   ├── product/           # Inventory management
│   │   ├── supplier/          # Supplier management
│   │   ├── order/             # Orders & sales
│   │   ├── return/            # Product returns
│   │   ├── report/            # Analytics & reports
│   │   └── notification/      # Notification system
│   └── services/
│       └── notification.service.js  # Notification logic + low stock alerts
└── frontend/
    └── public/
        ├── index.html         # SPA shell
        ├── app.js             # All frontend logic
        └── style.css          # Styling
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- MongoDB Atlas account (or local MongoDB)

### 1. Clone the repository

```bash
git clone https://github.com/your-username/style-shop.git
cd style-shop
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the root directory:

```env
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/<dbname>
JWT_SECRET=<your_secret_key>
PORT=<your_port>
```

> ⚠️ If using MongoDB Atlas, make sure to whitelist your IP address in **Network Access**.

### 4. Seed the database

```bash
npm run seed
```

This creates default employees, 3 suppliers, and 8 sample products.

### 5. Start the server

```bash
# Production
npm start

# Development (with auto-reload)
npm run dev
```

Open your browser at: **http://localhost:<your_port>**

---

## 🔑 Default Login Credentials

| Role | Email | Password |
|---|---|---|
| 👑 Manager | `admin@store.com` | `admin123` |
| 🧾 Cashier | `cashier@store.com` | `cash123` |
| 📦 Stock Clerk | `stock@store.com` | `stock123` |

---

## 📡 API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/profile` | Get current user |

### Products
| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/products` | All roles |
| POST | `/api/products` | Manager, Stock Clerk |
| PUT | `/api/products/:id` | Manager, Stock Clerk |
| DELETE | `/api/products/:id` | Manager only |
| GET | `/api/products/low-stock` | All roles |

### Orders
| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/orders` | All roles |
| POST | `/api/orders` | Manager, Cashier |
| PATCH | `/api/orders/:id/status` | Manager, Cashier |

### Suppliers
| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/suppliers` | All roles |
| POST | `/api/suppliers` | Manager only |
| PUT | `/api/suppliers/:id` | Manager only |
| DELETE | `/api/suppliers/:id` | Manager only |

### Reports
| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/reports/dashboard` | All roles |
| GET | `/api/reports/sales` | Manager only |
| GET | `/api/reports/inventory` | Manager, Stock Clerk |
| GET | `/api/reports/best-sellers` | All roles |

### Notifications
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/notifications` | Get my notifications |
| PATCH | `/api/notifications/read-all` | Mark all as read |
| PATCH | `/api/notifications/:id/read` | Mark one as read |

---

## 🔔 Notification System

- Every operation (order, product update, delete, supplier change…) generates a notification stored in MongoDB.
- Notifications are **audience-targeted** by role — managers see everything, stock clerks only see low-stock alerts.
- The frontend **polls every 30 seconds** and shows an unread count badge on the bell icon.
- Low stock threshold is configurable per product (default: 5 units).

---

## 📊 Reports & Analytics

All reports are powered by **MongoDB aggregation pipelines**:

- **Daily & Monthly Revenue** — grouped by date with totals
- **Category Performance** — revenue and units sold per category
- **Best Sellers** — top products by quantity sold
- **Payment Method Breakdown** — donut chart of cash / card / transfer
- **Inventory Report** — full stock snapshot with total value

---

## 📄 License

This project is licensed under the **MIT License**.

---

## 👤 Author

**Abdo**  
Full-Stack Developer — Node.js · MongoDB · Vue.js  
Open to freelance projects 🤝
