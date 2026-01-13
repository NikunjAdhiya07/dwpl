import mongoose, { Schema } from 'mongoose';
import { IOutwardChallan, IOutwardChallanItem } from '@/types';

const OutwardChallanItemSchema = new Schema<IOutwardChallanItem>(
  {
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
      min: [1, 'Annealing count must be at least 1'],
      max: [10, 'Annealing count cannot exceed 10'],
    },
    drawPassCount: {
      type: Number,
      required: [true, 'Draw pass count is required'],
      min: [1, 'Draw pass count must be at least 1'],
      max: [8, 'Draw pass count cannot exceed 8'],
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
    itemTotal: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  { _id: false }
);

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
    items: {
      type: [OutwardChallanItemSchema],
      required: [true, 'At least one item is required'],
      validate: {
        validator: function(items: IOutwardChallanItem[]) {
          return items && items.length > 0;
        },
        message: 'Outward Challan must have at least one item',
      },
    },
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
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

// Auto-calculate charges and totals before saving
OutwardChallanSchema.pre('save', function () {
  // Calculate item totals
  this.items.forEach((item) => {
    const baseAmount = item.quantity * item.rate;
    const totalAnnealingCharge = item.annealingCharge * item.quantity * item.annealingCount;
    const totalDrawCharge = item.drawCharge * item.quantity * item.drawPassCount;
    item.itemTotal = baseAmount + totalAnnealingCharge + totalDrawCharge;
  });
  
  // Calculate overall total
  this.totalAmount = this.items.reduce((sum, item) => sum + item.itemTotal, 0);
});

// Create indexes
OutwardChallanSchema.index({ party: 1, challanDate: -1 });
OutwardChallanSchema.index({ challanNumber: 1 });

export const OutwardChallan = mongoose.models.OutwardChallan || mongoose.model<IOutwardChallan>('OutwardChallan', OutwardChallanSchema);
