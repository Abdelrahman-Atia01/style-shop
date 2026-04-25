import { Supplier } from '../../DB/models/supplier.model.js';
import { createNotification } from '../../services/notification.service.js';

export const getAll = async (req, res) => {
  try {
    const suppliers = await Supplier.find({}).sort({ name: 1 });
    res.json({ success: true, data: suppliers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getOne = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });
    res.json({ success: true, data: supplier });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const create = async (req, res) => {
  try {
    const { name, email, phone, address, supplied_products } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Supplier name is required' });

    const supplier = await Supplier.create({
      name, email: email || null, phone: phone || null,
      address: address || null, supplied_products: supplied_products || null,
    });

    await createNotification({
      type: 'supplier_created', title: 'New Supplier Added',
      message: `Supplier "${name}" was added to the system.`,
      entity_type: 'supplier', entity_id: supplier._id,
      triggered_by: req.user.id, audience: ['manager'],
    });

    res.status(201).json({ success: true, id: supplier._id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const update = async (req, res) => {
  try {
    const { name, email, phone, address, supplied_products } = req.body;
    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      { name, email, phone, address, supplied_products },
      { new: true, runValidators: true }
    );
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });

    await createNotification({
      type: 'supplier_updated', title: 'Supplier Updated',
      message: `Supplier "${supplier.name}" was updated.`,
      entity_type: 'supplier', entity_id: supplier._id,
      triggered_by: req.user.id, audience: ['manager'],
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const remove = async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndDelete(req.params.id);
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });

    await createNotification({
      type: 'supplier_deleted', title: 'Supplier Removed',
      message: `Supplier "${supplier.name}" was removed.`,
      entity_type: 'supplier', entity_id: supplier._id,
      triggered_by: req.user.id, audience: ['manager'],
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
