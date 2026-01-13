import mongoose, { Schema } from 'mongoose';
import { ITransportMaster } from '@/types';

const TransportMasterSchema = new Schema<ITransportMaster>(
  {
    vehicleNumber: {
      type: String,
      required: [true, 'Vehicle number is required'],
      trim: true,
      uppercase: true,
      unique: true,
    },
    transporterName: {
      type: String,
      required: [true, 'Transporter name is required'],
      trim: true,
    },
    ownerName: {
      type: String,
      required: [true, 'Owner name is required'],
      trim: true,
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

// Create index
TransportMasterSchema.index({ vehicleNumber: 1 });

export const TransportMaster = mongoose.models.TransportMaster || mongoose.model<ITransportMaster>('TransportMaster', TransportMasterSchema);
