import { Return }  from '../../DB/models/return.model.js';
import { Product } from '../../DB/models/product.model.js';
import { Order }   from '../../DB/models/order.model.js';
import { createNotification } from '../../services/notification.service.js';

export const getAll = async (req, res) => {
  try {
    const returns = await Return.find({})
      .populate('order_id', 'order_date final_amount')
      .populate('product_id', 'name sku')
      .populate('customer_id', 'first_name last_name')
      .sort({ return_date: -1 });
    res.json({ success: true, data: returns });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const create = async (req, res) => {
  try {
    const { order_id, product_id, quantity, reason, action } = req.body;
    if (!order_id || !product_id || !quantity)
      return res.status(400).json({ success: false, message: 'order_id, product_id and quantity are required' });

    const order = await Order.findById(order_id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const ret = await Return.create({
      order_id, product_id,
      customer_id: order.customer_id || null,
      employee_id: req.user.id,
      quantity, reason: reason || null,
      action: action || 'refund',
    });

    // restore stock on return
    await Product.findByIdAndUpdate(product_id, { $inc: { stock_quantity: quantity } });

    const product = await Product.findById(product_id).select('name');
    await createNotification({
      type: 'return_created', title: 'Product Return Processed',
      message: `${quantity}x ${product?.name || 'item'} returned from order #${order_id}. Action: ${action || 'refund'}.`,
      entity_type: 'return', entity_id: ret._id,
      triggered_by: req.user.id, audience: ['manager'],
    });

    res.status(201).json({ success: true, id: ret._id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
