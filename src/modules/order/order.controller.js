import mongoose from 'mongoose';
import { Order }    from '../../DB/models/order.model.js';
import { Product }  from '../../DB/models/product.model.js';
import { Customer } from '../../DB/models/customer.model.js';
import { createNotification, checkAndAlertLowStock } from '../../services/notification.service.js';

export const getAll = async (req, res) => {
  try {
    const { status, from, to, search } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (from || to) {
      filter.order_date = {};
      if (from) filter.order_date.$gte = new Date(from);
      if (to)   filter.order_date.$lte = new Date(to + 'T23:59:59');
    }

    let orders = await Order.find(filter)
      .populate('customer_id', 'first_name last_name phone')
      .populate('employee_id', 'name')
      .sort({ order_date: -1 });

    // text search on customer name or order id
    if (search) {
      const rx = new RegExp(search, 'i');
      orders = orders.filter(o =>
        String(o._id).includes(search) ||
        o.customer_id?.first_name?.match(rx) ||
        o.customer_id?.last_name?.match(rx)
      );
    }

    // flatten for frontend compatibility
    const data = orders.map(o => {
      const obj = o.toJSON();
      obj.order_id   = obj._id;
      obj.first_name = o.customer_id?.first_name || null;
      obj.last_name  = o.customer_id?.last_name  || null;
      return obj;
    });

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getOne = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer_id', 'first_name last_name phone')
      .populate('employee_id', 'name')
      .populate('items.product_id', 'name sku size color');

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const obj = order.toJSON();
    obj.order_id = obj._id;
    // reshape items for frontend
    obj.items = (obj.items || []).map(item => ({
      ...item,
      product: item.product_id,
    }));
    res.json({ success: true, data: obj });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const create = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { customer_id, items, payment_method, discount = 0, notes } = req.body;

    if (!items || !items.length)
      return res.status(400).json({ success: false, message: 'Order must have at least one item' });

    // validate + fetch products in one query
    const productIds = items.map(i => i.product_id);
    const products   = await Product.find({ _id: { $in: productIds } }).session(session);

    const productMap = {};
    for (const p of products) productMap[String(p._id)] = p;

    const orderItems = [];
    let total = 0;

    for (const item of items) {
      const product = productMap[String(item.product_id)];
      if (!product) throw new Error(`Product ${item.product_id} not found`);
      if (product.stock_quantity < item.quantity)
        throw new Error(`Insufficient stock for "${product.name}" (available: ${product.stock_quantity})`);

      const unit_price  = parseFloat(product.price);
      const total_price = unit_price * item.quantity;
      total += total_price;
      orderItems.push({ product_id: product._id, quantity: item.quantity, unit_price, total_price });
    }

    const final_amount = Math.max(0, total - parseFloat(discount));

    // create order
    const [order] = await Order.create([{
      customer_id:    customer_id || null,
      employee_id:    req.user.id,
      items:          orderItems,
      total_amount:   total,
      discount:       parseFloat(discount),
      tax:            0,
      final_amount,
      payment_method: payment_method || 'cash',
      notes:          notes || null,
      status:         'pending',
    }], { session });

    // decrement stock for each item
    const affectedIds = [];
    for (const item of orderItems) {
      await Product.findByIdAndUpdate(
        item.product_id,
        { $inc: { stock_quantity: -item.quantity } },
        { session }
      );
      affectedIds.push(item.product_id);
    }

    await session.commitTransaction();

    // notifications (outside transaction – fire-and-forget)
    await createNotification({
      type: 'order_created', title: 'New Order Created',
      message: `Order #${order._id} for ${fmt(final_amount)} was created.`,
      entity_type: 'order', entity_id: order._id,
      triggered_by: req.user.id, audience: ['manager'],
    });
    await checkAndAlertLowStock(affectedIds);

    res.status(201).json({ success: true, id: order._id, order_id: order._id, final_amount });
  } catch (err) {
    await session.abortTransaction();
    res.status(400).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

export const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'completed', 'cancelled'].includes(status))
      return res.status(400).json({ success: false, message: 'Invalid status' });

    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    await createNotification({
      type: `order_${status}`, title: `Order ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      message: `Order #${order._id} was marked as ${status}.`,
      entity_type: 'order', entity_id: order._id,
      triggered_by: req.user.id, audience: ['manager'],
    });

    // if cancelled, restore stock
    if (status === 'cancelled') {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product_id, { $inc: { stock_quantity: item.quantity } });
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

function fmt(n) { return '$' + (parseFloat(n) || 0).toFixed(2); }
