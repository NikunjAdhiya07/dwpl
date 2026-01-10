import mongoose, { Schema, HydratedDocument } from 'mongoose';
import { ITaxInvoice } from '@/types';

const TaxInvoiceSchema = new Schema<ITaxInvoice>(
  {
    invoiceNumber: {
      type: String,
      required: [true, 'Invoice number is required'],
      unique: true,
      trim: true,
    },
    outwardChallan: {
      type: String,
      ref: 'OutwardChallan',
      required: [true, 'Outward challan reference is required'],
    },
    party: {
      type: String,
      ref: 'PartyMaster',
      required: [true, 'Party is required'],
    },
    finishSize: {
      type: String,
      ref: 'ItemMaster',
      required: [true, 'Finish Size is required'],
    },
    originalSize: {
      type: String,
      ref: 'ItemMaster',
      required: [true, 'Original Size is required'],
    },
    annealingCount: {
      type: Number,
      required: true,
    },
    drawPassCount: {
      type: Number,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    rate: {
      type: Number,
      required: true,
    },
    annealingCharge: {
      type: Number,
      required: true,
    },
    drawCharge: {
      type: Number,
      required: true,
    },
    baseAmount: {
      type: Number,
      // Auto-calculated by pre-save hook
    },
    gstPercentage: {
      type: Number,
      required: [true, 'GST percentage is required'],
      min: [0, 'GST percentage cannot be negative'],
    },
    gstAmount: {
      type: Number,
      // Auto-calculated by pre-save hook
    },
    totalAmount: {
      type: Number,
      // Auto-calculated by pre-save hook
    },
    invoiceDate: {
      type: Date,
      required: [true, 'Invoice date is required'],
      default: Date.now,
    },
    
    // Additional Invoice Details
    irnNumber: {
      type: String,
      trim: true,
    },
    poNumber: {
      type: String,
      trim: true,
    },
    paymentTerm: {
      type: String,
      default: '0 Days',
    },
    supplierCode: {
      type: String,
      default: '0',
    },
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
    eWayBillNo: {
      type: String,
      trim: true,
    },
    dispatchedThrough: {
      type: String,
      default: 'By Road',
    },
    packingType: {
      type: String,
      default: 'KGS',
    },
    transportCharges: {
      type: Number,
      default: 0,
    },
    assessableValue: {
      type: Number,
    },
    cgstPercentage: {
      type: Number,
      default: 0,
    },
    sgstPercentage: {
      type: Number,
      default: 0,
    },
    igstPercentage: {
      type: Number,
      default: 0,
    },
    cgstAmount: {
      type: Number,
      default: 0,
    },
    sgstAmount: {
      type: Number,
      default: 0,
    },
    igstAmount: {
      type: Number,
      default: 0,
    },
    tcsPercentage: {
      type: Number,
      default: 0,
    },
    tcsAmount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-calculate GST breakdown, TCS, and total amount before saving
TaxInvoiceSchema.pre('save', async function () {
  console.log('Pre-save hook triggered for TaxInvoice');
  
  // Calculate base amount (material + processing charges)
  const materialAmount = this.quantity * this.rate;
  const totalAnnealingCharge = this.annealingCharge * this.quantity * this.annealingCount;
  const totalDrawCharge = this.drawCharge * this.quantity * this.drawPassCount;
  
  this.baseAmount = materialAmount + totalAnnealingCharge + totalDrawCharge;
  
  console.log('Base amount calculated:', {
    materialAmount,
    totalAnnealingCharge,
    totalDrawCharge,
    baseAmount: this.baseAmount,
  });
  
  // Calculate assessable value (base + transport charges)
  const transportCharges = this.transportCharges || 0;
  this.assessableValue = this.baseAmount + transportCharges;
  
  // Calculate GST breakdown
  // If CGST and SGST are set (intra-state), use them
  // Otherwise, use IGST (inter-state)
  if (this.cgstPercentage && this.cgstPercentage > 0) {
    // Intra-state transaction: CGST + SGST
    this.cgstAmount = (this.assessableValue * this.cgstPercentage) / 100;
    this.sgstAmount = (this.assessableValue * (this.sgstPercentage || this.cgstPercentage)) / 100;
    this.igstAmount = 0;
    this.gstAmount = this.cgstAmount + this.sgstAmount;
    
    console.log('GST calculated (CGST+SGST):', {
      cgstPercentage: this.cgstPercentage,
      sgstPercentage: this.sgstPercentage,
      cgstAmount: this.cgstAmount,
      sgstAmount: this.sgstAmount,
      gstAmount: this.gstAmount,
    });
  } else if (this.igstPercentage && this.igstPercentage > 0) {
    // Inter-state transaction: IGST only
    this.igstAmount = (this.assessableValue * this.igstPercentage) / 100;
    this.cgstAmount = 0;
    this.sgstAmount = 0;
    this.gstAmount = this.igstAmount;
    
    console.log('GST calculated (IGST):', {
      igstPercentage: this.igstPercentage,
      igstAmount: this.igstAmount,
      gstAmount: this.gstAmount,
    });
  } else {
    // Fallback: use gstPercentage and split equally into CGST/SGST
    const halfGST = this.gstPercentage / 2;
    this.cgstPercentage = halfGST;
    this.sgstPercentage = halfGST;
    this.cgstAmount = (this.assessableValue * halfGST) / 100;
    this.sgstAmount = (this.assessableValue * halfGST) / 100;
    this.igstAmount = 0;
    this.gstAmount = this.cgstAmount + this.sgstAmount;
    
    console.log('GST calculated (Fallback):', {
      gstPercentage: this.gstPercentage,
      halfGST,
      cgstAmount: this.cgstAmount,
      sgstAmount: this.sgstAmount,
      gstAmount: this.gstAmount,
    });
  }
  
  // Calculate TCS if applicable
  const tcsPercentage = this.tcsPercentage || 0;
  this.tcsAmount = ((this.assessableValue + this.gstAmount) * tcsPercentage) / 100;
  
  // Calculate final total amount
  this.totalAmount = this.assessableValue + this.gstAmount + this.tcsAmount;
  
  console.log('Final amounts:', {
    assessableValue: this.assessableValue,
    gstAmount: this.gstAmount,
    tcsAmount: this.tcsAmount,
    totalAmount: this.totalAmount,
  });
});

// Create indexes
TaxInvoiceSchema.index({ party: 1, invoiceDate: -1 });
TaxInvoiceSchema.index({ outwardChallan: 1 });

export const TaxInvoice = mongoose.models.TaxInvoice || mongoose.model<ITaxInvoice>('TaxInvoice', TaxInvoiceSchema);
