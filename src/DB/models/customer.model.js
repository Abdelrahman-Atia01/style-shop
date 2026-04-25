import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  first_name: { type: String, required: true, trim: true },
  last_name:  { type: String, required: true, trim: true },
  email:      { type: String, lowercase: true, trim: true, default: null },
  phone:      { type: String, trim: true, default: null },
  address:    { type: String, default: null },
}, { timestamps: true });

customerSchema.index({ phone: 1 });
customerSchema.index({ first_name: 'text', last_name: 'text' });

export const Customer = mongoose.model('Customer', customerSchema);
