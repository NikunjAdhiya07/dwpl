import mongoose, { Schema } from 'mongoose';
import { IGRN } from '@/types';
import './PartyMaster';
import './ItemMaster';

const GRNItemSchema = new Schema({
  rmSize: {
    type: String,
    ref: 'ItemMaster',
    required: [true, 'RM Size is required'],
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0.01, 'Quantity must be greater than 0'],
  },
  rate: {
    type: Number,
    required: [true, 'Rate is required'],
    min: [0, 'Rate cannot be negative'],
  },
  coilNumber: {
    type: String,
    trim: true,
    uppercase: true,
  },
  coilReference: {
    type: String,
    trim: true,
  },
}, { _id: false });

const GRNSchema = new Schema<IGRN>(
  {
    sendingParty: {
      type: String,
      ref: 'PartyMaster',
      required: [true, 'Sending party is required'],
    },
    partyChallanNumber: {
      type: String,
      required: [true, 'Party challan number is required'],
      trim: true,
    },
    items: {
      type: [GRNItemSchema],
      required: [true, 'At least one item is required'],
      validate: {
        validator: function(items: any[]) {
          return items && items.length > 0;
        },
        message: 'GRN must contain at least one item'
      }
    },
    totalValue: {
      type: Number,
      required: true,
    },
    grnDate: {
      type: Date,
      required: [true, 'GRN date is required'],
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-calculate total value before saving
GRNSchema.pre('save', function () {
  this.totalValue = this.items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
});

// Create indexes
GRNSchema.index({ sendingParty: 1, grnDate: -1 });
GRNSchema.index({ 'items.rmSize': 1 });

// Ensure one challan per party (unique constraint)
GRNSchema.index({ sendingParty: 1, partyChallanNumber: 1 }, { unique: true });

export const GRN = mongoose.models.GRN || mongoose.model<IGRN>('GRN', GRNSchema);

