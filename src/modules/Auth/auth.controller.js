import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Employee } from '../../DB/models/employee.model.js';

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password are required' });

    const employee = await Employee.findOne({ email: email.trim().toLowerCase() });

    if (!employee) {
      console.log(`[Login] No employee found for email: ${email}`);
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!employee.is_active) {
      return res.status(401).json({ success: false, message: 'Account is deactivated' });
    }

    // Try bcrypt compare first
    let valid = false;
    try {
      valid = await bcrypt.compare(password, employee.password);
    } catch (bcryptErr) {
      console.log(`[Login] bcrypt error: ${bcryptErr.message}`);
    }

    // Fallback: plain-text match (handles un-hashed legacy passwords)
    if (!valid && employee.password === password) {
      valid = true;
      // Auto-upgrade to hashed password
      const hashed = await bcrypt.hash(password, 10);
      await Employee.updateOne({ _id: employee._id }, { password: hashed });
      console.log(`[Login] Auto-upgraded plain-text password for: ${email}`);
    }

    if (!valid) {
      console.log(`[Login] Wrong password for: ${email}`);
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: employee._id, name: employee.name, email: employee.email, role: employee.role },
      process.env.JWT_SECRET || 'style_shop_secret',
      { expiresIn: '8h' }
    );

    res.json({
      success: true,
      token,
      user: { id: employee._id, name: employee.name, role: employee.role, email: employee.email },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getProfile = async (req, res) => {
  try {
    const employee = await Employee.findById(req.user.id).select('-password');
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    res.json({ success: true, data: employee });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

