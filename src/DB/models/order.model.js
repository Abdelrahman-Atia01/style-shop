import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  product_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity:    { type: Number, required: true, min: 1 },
  unit_price:  { type: Number, required: true },
  total_price: { type: Number, required: true },
}, { _id: true });

const orderSchema = new mongoose.Schema({
  customer_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
  employee_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  items:          [orderItemSchema],
  total_amount:   { type: Number, default: 0 },
  discount:       { type: Number, default: 0 },
  tax:            { type: Number, default: 0 },
  final_amount:   { type: Number, default: 0 },
  payment_method: { type: String, enum: ['cash', 'card', 'transfer'], default: 'cash' },
  status:         { type: String, enum: ['pending', 'completed', 'cancelled'], default: 'pending' },
  notes:          { type: String, default: null },
  order_date:     { type: Date, default: Date.now },
}, { timestamps: true });

orderSchema.index({ status: 1 });
orderSchema.index({ order_date: -1 });
orderSchema.index({ customer_id: 1 });
orderSchema.index({ employee_id: 1 });

export const Order = mongoose.model('Order', orderSchema);
