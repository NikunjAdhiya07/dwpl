import mongoose, { Schema } from 'mongoose';
import { IOutwardChallan } from '@/types';

const OutwardChallanSchema = new Schema<IOutwardChallan>(
  {
    challanNumber: {
      type: String,
      required: [true, 'Challan number is required'],
      unique: true,
      trim: true,
    },
    party: {
      type: String,
      ref: 'PartyMaster',
      required: [true, 'Party is required'],
    },
    finishSize: {
      type: String,
      ref: 'ItemMaster',
      required: [true, 'Finish Size (FG) is required'],
    },
    originalSize: {
      type: String,
      ref: 'ItemMaster',
      required: [true, 'Original Size (RM) is required'],
    },
    annealingCount: {
      type: Number,
      required: [true, 'Annealing count is required'],
      min: [0, 'Annealing count cannot be less than 0'],
      max: [7, 'Annealing count cannot exceed 7'],
    },
    drawPassCount: {
      type: Number,
      required: [true, 'Draw pass count is required'],
      min: [0, 'Draw pass count cannot be less than 0'],
      max: [10, 'Draw pass count cannot exceed 10'],
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
    annealingCharge: {
      type: Number,
      required: true,
      default: 0,
    },
    drawCharge: {
      type: Number,
      required: true,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    challanDate: {
      type: Date,
      required: [true, 'Challan date is required'],
      default: Date.now,
    },
    
    // Transport Details
    vehicleNumber: {
      type: String,
      trim: true,
    },
    transportName: {
      type: String,
      trim: true,
    },
    ownerName: {
      type: String,
      trim: true,
    },
    dispatchedThrough: {
      type: String,
      default: 'By Road',
    },
  },
  {
    timestamps: true,
  }
);

// Auto-calculate charges and total amount before saving
OutwardChallanSchema.pre('save', function () {
  const baseAmount = this.quantity * this.rate;
  const totalAnnealingCharge = this.annealingCharge * this.quantity * this.annealingCount;
  const totalDrawCharge = this.drawCharge * this.quantity * this.drawPassCount;
  this.totalAmount = baseAmount + totalAnnealingCharge + totalDrawCharge;
});

// Create indexes
OutwardChallanSchema.index({ party: 1, challanDate: -1 });
OutwardChallanSchema.index({ challanNumber: 1 });

export const OutwardChallan = mongoose.models.OutwardChallan || mongoose.model<IOutwardChallan>('OutwardChallan', OutwardChallanSchema);
