import mongoose from 'mongoose';

const returnSchema = new mongoose.Schema({
  order_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  product_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  customer_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
  employee_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  quantity:     { type: Number, required: true, min: 1 },
  reason:       { type: String, default: null },
  action:       { type: String, enum: ['refund', 'exchange'], default: 'refund' },
  return_date:  { type: Date, default: Date.now },
}, { timestamps: false });

returnSchema.index({ order_id: 1 });

export const Return = mongoose.model('Return', returnSchema);
