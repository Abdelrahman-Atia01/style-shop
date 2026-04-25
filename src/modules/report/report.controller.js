import mongoose from 'mongoose';
import { Order }   from '../../DB/models/order.model.js';
import { Product } from '../../DB/models/product.model.js';

export const getDashboard = async (req, res) => {
  try {
    const now       = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sixMonAgo  = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // Today's stats
    const todayAgg = await Order.aggregate([
      { $match: { order_date: { $gte: todayStart }, status: { $ne: 'cancelled' } } },
      { $group: { _id: null, total_orders: { $sum: 1 }, total_revenue: { $sum: '$final_amount' } } },
    ]);
    const today = todayAgg[0] || { total_orders: 0, total_revenue: 0 };

    // All-time completed revenue
    const allTimeAgg = await Order.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$final_amount' } } },
    ]);
    const allTime = allTimeAgg[0] || { total: 0 };

    // Product counts
    const products  = await Product.countDocuments({});
    const lowStockN = await Product.countDocuments({ $expr: { $lt: ['$stock_quantity', '$low_stock_threshold'] } });

    // Recent orders (last 10)
    const recentOrders = await Order.find({})
      .populate('customer_id', 'first_name last_name')
      .sort({ order_date: -1 })
      .limit(10)
      .lean();

    const recentFormatted = recentOrders.map(o => ({
      order_id:       o._id,
      order_date:     o.order_date,
      final_amount:   o.final_amount,
      status:         o.status,
      payment_method: o.payment_method,
      first_name:     o.customer_id?.first_name || null,
      last_name:      o.customer_id?.last_name  || null,
    }));

    // Monthly sales (last 6 months)
    const monthlySales = await Order.aggregate([
      { $match: { order_date: { $gte: sixMonAgo }, status: { $ne: 'cancelled' } } },
      { $group: {
        _id: { year: { $year: '$order_date' }, month: { $month: '$order_date' } },
        revenue: { $sum: '$final_amount' },
        orders:  { $sum: 1 },
      }},
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $project: {
        _id: 0,
        month: { $dateToString: { format: '%Y-%m', date: { $dateFromParts: { year: '$_id.year', month: '$_id.month', day: 1 } } } },
        revenue: 1,
        orders:  1,
      }},
    ]);

    // Category performance
    const categoryPerf = await Order.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      { $lookup: { from: 'products', localField: 'items.product_id', foreignField: '_id', as: 'product' } },
      { $unwind: '$product' },
      { $group: { _id: '$product.category', revenue: { $sum: '$items.total_price' }, units: { $sum: '$items.quantity' } } },
      { $project: { _id: 0, category: { $ifNull: ['$_id', 'Other'] }, revenue: 1, units: 1 } },
      { $sort: { revenue: -1 } },
    ]);

    res.json({
      success: true,
      data: { today, allTime, products, lowStock: lowStockN, recentOrders: recentFormatted, monthlySales, categoryPerf },
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getSalesReport = async (req, res) => {
  try {
    const { from, to } = req.query;
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 86400000);
    const toDate   = to   ? new Date(to + 'T23:59:59') : new Date();

    const data = await Order.aggregate([
      { $match: { order_date: { $gte: fromDate, $lte: toDate }, status: { $ne: 'cancelled' } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$order_date' } },
        revenue:   { $sum: '$final_amount' },
        discounts: { $sum: '$discount' },
        orders:    { $sum: 1 },
      }},
      { $project: { _id: 0, period: '$_id', revenue: 1, discounts: 1, orders: 1 } },
      { $sort: { period: 1 } },
    ]);

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getInventoryReport = async (req, res) => {
  try {
    const data = await Product.find({})
      .populate('supplier_id', 'name')
      .sort({ stock_quantity: 1 })
      .lean();

    const formatted = data.map(p => ({
      ...p,
      supplier_name: p.supplier_id?.name || null,
      stock_value:   parseFloat((p.price * p.stock_quantity).toFixed(2)),
    }));

    const summaryAgg = await Product.aggregate([
      { $group: {
        _id: null,
        total_items:    { $sum: '$stock_quantity' },
        total_value:    { $sum: { $multiply: ['$price', '$stock_quantity'] } },
        total_products: { $sum: 1 },
      }},
    ]);
    const summary = summaryAgg[0] || { total_items: 0, total_value: 0, total_products: 0 };

    res.json({ success: true, data: formatted, summary });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getBestSellers = async (req, res) => {
  try {
    const data = await Order.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      { $group: {
        _id:           '$items.product_id',
        total_sold:    { $sum: '$items.quantity' },
        total_revenue: { $sum: '$items.total_price' },
      }},
      { $sort: { total_sold: -1 } },
      { $limit: 20 },
      { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
      { $unwind: '$product' },
      { $project: {
        _id: 0,
        product_id:    '$_id',
        name:          '$product.name',
        sku:           '$product.sku',
        category:      '$product.category',
        total_sold:    1,
        total_revenue: 1,
      }},
    ]);

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
