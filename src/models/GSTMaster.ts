import mongoose, { Schema } from 'mongoose';
import { IGSTMaster } from '@/types';

const GSTMasterSchema = new Schema<IGSTMaster>(
  {
    party: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PartyMaster',
      required: [true, 'Party is required'],
    },
    cgstPercentage: {
      type: Number,
      required: [true, 'CGST percentage is required'],
      min: [0, 'CGST percentage cannot be negative'],
      max: [100, 'CGST percentage cannot exceed 100'],
      default: 0,
    },
    sgstPercentage: {
      type: Number,
      required: [true, 'SGST percentage is required'],
      min: [0, 'SGST percentage cannot be negative'],
      max: [100, 'SGST percentage cannot exceed 100'],
      default: 0,
    },
    igstPercentage: {
      type: Number,
      required: [true, 'IGST percentage is required'],
      min: [0, 'IGST percentage cannot be negative'],
      max: [100, 'IGST percentage cannot exceed 100'],
      default: 0,
    },
    tcsPercentage: {
      type: Number,
      min: [0, 'TCS percentage cannot be negative'],
      max: [100, 'TCS percentage cannot exceed 100'],
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create a unique compound index on party field to ensure only one GST rate per party
// This approach handles null values correctly during schema creation
GSTMasterSchema.index({ party: 1 }, { unique: true });

export const GSTMaster = mongoose.models.GSTMaster || mongoose.model<IGSTMaster>('GSTMaster', GSTMasterSchema);
