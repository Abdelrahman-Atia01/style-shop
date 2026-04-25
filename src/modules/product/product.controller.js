import { Product }  from '../../DB/models/product.model.js';
import { Supplier } from '../../DB/models/supplier.model.js';
import { createNotification, checkAndAlertLowStock } from '../../services/notification.service.js';

export const getAll = async (req, res) => {
  try {
    const { category, search, low_stock } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (search)   filter.$or = [
      { name: new RegExp(search, 'i') },
      { sku:  new RegExp(search, 'i') },
    ];
    if (low_stock === 'true')
      filter.$expr = { $lt: ['$stock_quantity', '$low_stock_threshold'] };

    const products = await Product.find(filter)
      .populate('supplier_id', 'name')
      .sort({ name: 1 });

    // reshape for frontend compatibility
    const data = products.map(p => {
      const obj = p.toJSON();
      obj.supplier      = obj.supplier_id || null;
      obj.supplier_name = obj.supplier_id?.name || null;
      return obj;
    });

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getOne = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('supplier_id', 'name');
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    const obj = product.toJSON();
    obj.supplier = obj.supplier_id || null;
    res.json({ success: true, data: obj });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const create = async (req, res) => {
  try {
    const { sku, name, category, size, color, price, cost_price, stock_quantity, low_stock_threshold, supplier_id } = req.body;
    if (!sku || !name || !price)
      return res.status(400).json({ success: false, message: 'SKU, name and price are required' });

    const product = await Product.create({
      sku, name, category: category || null, size: size || null,
      color: color || null, price, cost_price: cost_price || 0,
      stock_quantity: stock_quantity || 0,
      low_stock_threshold: low_stock_threshold || 5,
      supplier_id: supplier_id || null,
    });

    await createNotification({
      type: 'product_created', title: 'New Product Added',
      message: `${name} (${sku}) was added to inventory with ${stock_quantity || 0} units.`,
      entity_type: 'product', entity_id: product._id,
      triggered_by: req.user.id, audience: ['manager'],
    });

    // check stock on creation too
    await checkAndAlertLowStock([product._id]);

    res.status(201).json({ success: true, id: product._id });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, message: 'SKU already exists' });
    res.status(500).json({ success: false, message: err.message });
  }
};

export const update = async (req, res) => {
  try {
    const { name, category, size, color, price, cost_price, stock_quantity, low_stock_threshold, supplier_id } = req.body;
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { name, category, size, color, price, cost_price, stock_quantity, low_stock_threshold, supplier_id: supplier_id || null },
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    await createNotification({
      type: 'product_updated', title: 'Product Updated',
      message: `${product.name} was updated (stock: ${product.stock_quantity}).`,
      entity_type: 'product', entity_id: product._id,
      triggered_by: req.user.id, audience: ['manager'],
    });

    await checkAndAlertLowStock([product._id]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const remove = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    await createNotification({
      type: 'product_deleted', title: 'Product Removed',
      message: `${product.name} (${product.sku}) was removed from inventory.`,
      entity_type: 'product', entity_id: product._id,
      triggered_by: req.user.id, audience: ['manager'],
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getLowStock = async (req, res) => {
  try {
    const products = await Product.find({
      $expr: { $lt: ['$stock_quantity', '$low_stock_threshold'] },
    }).populate('supplier_id', 'name').sort({ stock_quantity: 1 });
    res.json({ success: true, data: products, count: products.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
