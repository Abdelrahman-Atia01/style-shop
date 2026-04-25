import { Notification } from '../DB/models/notification.model.js';
import { Product } from '../DB/models/product.model.js';

/**
 * Create a notification record.
 * @param {Object} opts
 * @param {string}   opts.type
 * @param {string}   opts.title
 * @param {string}   opts.message
 * @param {string}   [opts.entity_type]
 * @param {*}        [opts.entity_id]
 * @param {*}        [opts.triggered_by]  – employee _id
 * @param {string[]} [opts.audience]       – default ['manager']
 */
export async function createNotification(opts) {
  try {
    await Notification.create({
      type:         opts.type,
      title:        opts.title,
      message:      opts.message,
      entity_type:  opts.entity_type  || null,
      entity_id:    opts.entity_id    || null,
      triggered_by: opts.triggered_by || null,
      audience:     opts.audience     || ['manager'],
    });
  } catch (err) {
    // notifications must never crash the main flow
    console.error('Notification create error:', err.message);
  }
}

/**
 * After any stock-changing event, check for low-stock products and
 * emit alerts to manager + stock_clerk if stock < 5.
 * Prevents duplicate alerts within the same minute for the same product.
 */
export async function checkAndAlertLowStock(productIds = []) {
  try {
    const products = await Product.find({
      _id: { $in: productIds },
      $expr: { $lt: ['$stock_quantity', '$low_stock_threshold'] },
    }).select('name sku stock_quantity low_stock_threshold');

    for (const p of products) {
      // avoid duplicates: if an identical notification exists in last 5 min, skip
      const recent = await Notification.findOne({
        type:        'low_stock',
        entity_id:   p._id,
        createdAt:   { $gte: new Date(Date.now() - 5 * 60 * 1000) },
      });
      if (recent) continue;

      await createNotification({
        type:        'low_stock',
        title:       '⚠️ Low Stock Alert',
        message:     `${p.name} (${p.sku}) has only ${p.stock_quantity} unit(s) left.`,
        entity_type: 'product',
        entity_id:   p._id,
        audience:    ['manager', 'stock_clerk'],
      });
    }
  } catch (err) {
    console.error('Low stock check error:', err.message);
  }
}
