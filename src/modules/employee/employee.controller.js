import bcrypt from 'bcryptjs';
import { Employee } from '../../DB/models/employee.model.js';
import { createNotification } from '../../services/notification.service.js';

export const getAll = async (req, res) => {
  try {
    const employees = await Employee.find({}).select('-password').sort({ name: 1 });
    res.json({ success: true, data: employees });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getOne = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id).select('-password');
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    res.json({ success: true, data: employee });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const create = async (req, res) => {
  try {
    const { name, email, phone, password, role, salary, start_time, end_time } = req.body;
    if (!name || !email || !password || !role)
      return res.status(400).json({ success: false, message: 'Name, email, password and role are required' });

    const exists = await Employee.findOne({ email: email.toLowerCase() });
    if (exists)
      return res.status(409).json({ success: false, message: 'Email already in use' });

    const hashed   = await bcrypt.hash(password, 10);
    const employee = await Employee.create({
      name, email, phone: phone || null, password: hashed,
      role, salary: salary || 0,
      start_time: start_time || null, end_time: end_time || null,
    });

    await createNotification({
      type: 'employee_created', title: 'New Employee Added',
      message: `${name} (${role}) was added to the system.`,
      entity_type: 'employee', entity_id: employee._id,
      triggered_by: req.user.id, audience: ['manager'],
    });

    res.status(201).json({ success: true, id: employee._id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const update = async (req, res) => {
  try {
    const { name, email, phone, role, salary, start_time, end_time, is_active } = req.body;
    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      { name, email, phone, role, salary, start_time, end_time, is_active },
      { new: true, runValidators: true }
    ).select('-password');
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    res.json({ success: true, data: employee });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    if (!req.body.password)
      return res.status(400).json({ success: false, message: 'New password is required' });
    const hashed = await bcrypt.hash(req.body.password, 10);
    await Employee.findByIdAndUpdate(req.params.id, { password: hashed });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const remove = async (req, res) => {
  try {
    await Employee.findByIdAndUpdate(req.params.id, { is_active: false });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
