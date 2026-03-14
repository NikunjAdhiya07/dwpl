import mongoose, { Schema } from 'mongoose';
import { IGSTMaster } from '@/types';

const GSTMasterSchema = new Schema<IGSTMaster>(
  {
    party: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PartyMaster',
      required: [true, 'Party is required'],
      unique: true,
    },
    gstPercentage: {
      type: Number,
      required: [true, 'GST percentage is required'],
      min: [0, 'GST percentage cannot be negative'],
      max: [100, 'GST percentage cannot exceed 100'],
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

// Indexing is handled by unique: true in schema definition

export const GSTMaster = mongoose.models.GSTMaster || mongoose.model<IGSTMaster>('GSTMaster', GSTMasterSchema);
