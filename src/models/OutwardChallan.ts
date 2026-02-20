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
      min: [0, 'Annealing count cannot be negative'],
      max: [10, 'Annealing count cannot exceed 10'],
    },
    drawPassCount: {
      type: Number,
      required: [true, 'Draw pass count is required'],
      min: [0, 'Draw pass count cannot be negative'],
      max: [8, 'Draw pass count cannot exceed 8'],
    },
    extraAnnealingCount: {
      type: Number,
      default: 0,
      min: [0, 'Extra annealing count cannot be negative'],
      max: [20, 'Extra annealing count cannot exceed 20'],
    },
    extraPassCount: {
      type: Number,
      default: 0,
      min: [0, 'Extra pass count cannot be negative'],
      max: [20, 'Extra pass count cannot exceed 20'],
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
    issuedChallanNo: {
      type: String,
      trim: true,
    },
    coilNumber: {
      type: String,
      trim: true,
    },
    coilReference: {
      type: String,
      trim: true,
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
    billTo: {
      type: String,
      ref: 'PartyMaster',
    },
    shipTo: {
      type: String,
      ref: 'PartyMaster',
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
    eWayBillNo: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-calculate charges and totals before saving
OutwardChallanSchema.pre('save', function () {
  // Calculate item totals
  // @ts-ignore - items might not be typed correctly in pre-save
  this.items.forEach((item: any) => {
    item.itemTotal = item.quantity * item.rate;
  });
  
  // Calculate overall total
  // @ts-ignore
  this.totalAmount = this.items.reduce((sum: number, item: any) => sum + item.itemTotal, 0);
});

// Create indexes
OutwardChallanSchema.index({ party: 1, challanDate: -1 });

export const OutwardChallan = mongoose.models.OutwardChallan || mongoose.model<IOutwardChallan>('OutwardChallan', OutwardChallanSchema);
