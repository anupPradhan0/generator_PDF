import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    referenceNumber: {
      type: String,
      required: true,
      trim: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    mobileNo: {
      type: String,
      required: true,
      trim: true,
    },
    eventName: {
      type: String,
      required: true,
      trim: true,
    },
    eventDate: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true },
);

invoiceSchema.index({ user: 1, referenceNumber: 1 }, { unique: true });
invoiceSchema.index({ user: 1, eventDate: -1 });

const Invoice = mongoose.model('Invoice', invoiceSchema);

export default Invoice;
