import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true },
  email:      { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone:      { type: String, trim: true, default: null },
  password:   { type: String, required: true },
  role:       { type: String, enum: ['manager', 'cashier', 'stock_clerk'], required: true },
  salary:     { type: Number, default: 0 },
  start_time: { type: String, default: null },
  end_time:   { type: String, default: null },
  is_active:  { type: Boolean, default: true },
}, { timestamps: true });

employeeSchema.index({ role: 1 });

export const Employee = mongoose.model('Employee', employeeSchema);
