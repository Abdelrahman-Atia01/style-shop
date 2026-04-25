import { Customer } from '../../DB/models/customer.model.js';
import { Order }    from '../../DB/models/order.model.js';

export const getAll = async (req, res) => {
  try {
    const { search } = req.query;
    const filter = {};
    if (search) {
      const rx = new RegExp(search, 'i');
      filter.$or = [{ first_name: rx }, { last_name: rx }, { phone: rx }, { email: rx }];
    }
    const customers = await Customer.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: customers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getOne = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    const orders = await Order.find({ customer_id: req.params.id }).sort({ order_date: -1 });
    res.json({ success: true, data: { ...customer.toJSON(), orders } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const create = async (req, res) => {
  try {
    const { first_name, last_name, email, phone, address } = req.body;
    if (!first_name || !last_name)
      return res.status(400).json({ success: false, message: 'First and last name are required' });
    const customer = await Customer.create({ first_name, last_name, email: email || null, phone: phone || null, address: address || null });
    res.status(201).json({ success: true, id: customer._id, data: customer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const update = async (req, res) => {
  try {
    const { first_name, last_name, email, phone, address } = req.body;
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { first_name, last_name, email, phone, address },
      { new: true }
    );
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, data: customer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
