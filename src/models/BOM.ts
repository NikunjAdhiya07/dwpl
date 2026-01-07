import mongoose, { Schema } from 'mongoose';
import { IBOM } from '@/types';

const BOMSchema = new Schema<IBOM>(
  {
    fgSize: {
      type: String,
      required: [true, 'Finish Size (FG) is required'],
      trim: true,
    },
    rmSize: {
      type: String,
      required: [true, 'Original Size (RM) is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: ['Active', 'Inactive'],
        message: 'Status must be either Active or Inactive',
      },
      default: 'Active',
    },
  },
  {
    timestamps: true,
  }
);

// Create compound index for uniqueness (fgSize and rmSize must be unique together)
BOMSchema.index({ fgSize: 1, rmSize: 1 }, { unique: true });

export const BOM = mongoose.models.BOM || mongoose.model<IBOM>('BOM', BOMSchema);

