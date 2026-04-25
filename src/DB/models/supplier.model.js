import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema({
  name:              { type: String, required: true, trim: true },
  email:             { type: String, lowercase: true, trim: true, default: null },
  phone:             { type: String, trim: true, default: null },
  address:           { type: String, default: null },
  supplied_products: { type: String, default: null },
}, { timestamps: true });

supplierSchema.index({ name: 1 });

export const Supplier = mongoose.model('Supplier', supplierSchema);
