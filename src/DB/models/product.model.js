import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  sku:                 { type: String, required: true, unique: true, uppercase: true, trim: true },
  name:                { type: String, required: true, trim: true },
  category:            { type: String, trim: true, default: null },
  size:                { type: String, trim: true, default: null },
  color:               { type: String, trim: true, default: null },
  price:               { type: Number, required: true, min: 0 },
  cost_price:          { type: Number, default: 0, min: 0 },
  stock_quantity:      { type: Number, default: 0, min: 0 },
  low_stock_threshold: { type: Number, default: 5, min: 0 },
  supplier_id:         { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null },
}, { timestamps: true });

productSchema.index({ category: 1 });
productSchema.index({ name: 'text', sku: 'text' });
productSchema.index({ stock_quantity: 1, low_stock_threshold: 1 });

export const Product = mongoose.model('Product', productSchema);
