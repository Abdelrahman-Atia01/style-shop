/**
 * Seed script – run once: node src/DB/seed.js
 * Creates default employees, suppliers, and sample products.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt   from 'bcryptjs';
import { Employee } from './models/employee.model.js';
import { Supplier } from './models/supplier.model.js';
import { Product }  from './models/product.model.js';

const MONGO_URI = process.env.MONGO_URI;

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // ── Employees ──────────────────────────────────────────
  const employees = [
    { name: 'Admin Manager',  email: 'admin@store.com',   password: 'admin123',  role: 'manager'     },
    { name: 'Sara Cashier',   email: 'cashier@store.com', password: 'cash123',   role: 'cashier'     },
    { name: 'Omar Stock',     email: 'stock@store.com',   password: 'stock123',  role: 'stock_clerk' },
  ];

  for (const emp of employees) {
    const hashed = await bcrypt.hash(emp.password, 10);
    const exists = await Employee.findOne({ email: emp.email });
    if (!exists) {
      await Employee.create({ ...emp, password: hashed, is_active: true });
      console.log(`  👤 Created employee: ${emp.email}`);
    } else {
      // Always force-update the password to ensure it matches the seed credentials
      await Employee.updateOne({ email: emp.email }, { password: hashed, is_active: true });
      console.log(`  🔄 Updated password for: ${emp.email}`);
    }
  }

  // ── Suppliers ──────────────────────────────────────────
  const suppliers = [
    { name: 'Cairo Textiles Co.',  phone: '+20 100 123 4567', email: 'info@cairotextiles.com', supplied_products: "Men's Shirts, T-Shirts" },
    { name: 'Delta Fashion Group', phone: '+20 112 987 6543', email: 'orders@deltafashion.com', supplied_products: "Jackets, Trousers" },
    { name: 'Kids World Supply',   phone: '+20 101 555 7890', email: 'supply@kidsworld.com',   supplied_products: "Children's Wear" },
  ];

  let supplierDocs = [];
  for (const sup of suppliers) {
    let doc = await Supplier.findOne({ name: sup.name });
    if (!doc) {
      doc = await Supplier.create(sup);
      console.log(`  🏭 Created supplier: ${sup.name}`);
    } else {
      console.log(`  ⏭️  Supplier exists: ${sup.name}`);
    }
    supplierDocs.push(doc);
  }

  // ── Products ───────────────────────────────────────────
  const products = [
    { sku: 'MNS-WH-M',  name: "Men's White Shirt",    category: "Men's Shirts",    size: 'M',  color: 'White', price: 25.99, cost_price: 12.00, stock_quantity: 20, supplier_id: supplierDocs[0]?._id },
    { sku: 'MNS-BL-L',  name: "Men's Blue Shirt",     category: "Men's Shirts",    size: 'L',  color: 'Blue',  price: 27.99, cost_price: 13.00, stock_quantity: 15, supplier_id: supplierDocs[0]?._id },
    { sku: 'MNS-BLK-XL',name: "Men's Black T-Shirt",  category: "Men's T-Shirts",  size: 'XL', color: 'Black', price: 18.99, cost_price: 8.00,  stock_quantity: 30, supplier_id: supplierDocs[0]?._id },
    { sku: 'JKT-NVY-L',  name: "Men's Navy Jacket",   category: 'Jackets',         size: 'L',  color: 'Navy',  price: 89.99, cost_price: 45.00, stock_quantity: 8,  supplier_id: supplierDocs[1]?._id },
    { sku: 'TRS-BLK-32', name: "Men's Black Trousers", category: 'Trousers',        size: '32', color: 'Black', price: 45.99, cost_price: 22.00, stock_quantity: 12, supplier_id: supplierDocs[1]?._id },
    { sku: 'KDS-RED-4',  name: "Kids Red T-Shirt",    category: "Children's Wear", size: '4Y', color: 'Red',   price: 14.99, cost_price: 6.00,  stock_quantity: 3,  low_stock_threshold: 5, supplier_id: supplierDocs[2]?._id },
    { sku: 'KDS-BLU-6',  name: "Kids Blue Jeans",     category: "Children's Wear", size: '6Y', color: 'Blue',  price: 22.99, cost_price: 10.00, stock_quantity: 2,  low_stock_threshold: 5, supplier_id: supplierDocs[2]?._id },
    { sku: 'MNS-GRY-M',  name: "Men's Grey Polo",     category: "Men's T-Shirts",  size: 'M',  color: 'Grey',  price: 22.99, cost_price: 10.00, stock_quantity: 25, supplier_id: supplierDocs[0]?._id },
  ];

  for (const prod of products) {
    const exists = await Product.findOne({ sku: prod.sku });
    if (!exists) {
      await Product.create(prod);
      console.log(`  📦 Created product: ${prod.sku} – ${prod.name}`);
    } else {
      console.log(`  ⏭️  Product exists: ${prod.sku}`);
    }
  }

  console.log('\n✅ Seed completed!');
  console.log('\n🔑 Login credentials:');
  console.log('   Manager    → admin@store.com   / admin123');
  console.log('   Cashier    → cashier@store.com / cash123');
  console.log('   Stock Clerk→ stock@store.com   / stock123');
  await mongoose.disconnect();
}

seed().catch(err => { console.error('Seed error:', err); process.exit(1); });
