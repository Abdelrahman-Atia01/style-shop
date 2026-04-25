import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  type:        { type: String, required: true }, // 'order_created','low_stock','product_updated', etc.
  title:       { type: String, required: true },
  message:     { type: String, required: true },
  entity_type: { type: String, default: null },  // 'order','product','supplier','employee'
  entity_id:   { type: mongoose.Schema.Types.ObjectId, default: null },
  // who triggered it
  triggered_by:{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
  // audience: array of role strings ['manager'] or ['manager','stock_clerk']
  audience:    [{ type: String, enum: ['manager', 'cashier', 'stock_clerk'] }],
  // per-user read receipts
  read_by:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],
}, { timestamps: true });

notificationSchema.index({ audience: 1, createdAt: -1 });
notificationSchema.index({ createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);
