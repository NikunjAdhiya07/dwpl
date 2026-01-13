import mongoose, { Schema } from 'mongoose';
import { IPartyMaster } from '@/types';

const PartyMasterSchema = new Schema<IPartyMaster>(
  {
    partyName: {
      type: String,
      required: [true, 'Party name is required'],
      trim: true,
      unique: true,
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
    },
    gstNumber: {
      type: String,
      required: [true, 'GST number is required'],
      trim: true,
      uppercase: true,
      match: [/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GST number format'],
    },
    contactNumber: {
      type: String,
      required: [true, 'Contact number is required'],
      trim: true,
    },
    rate: {
      type: Number,
      required: [true, 'Rate is required'],
      min: [0, 'Rate cannot be negative'],
    },
    annealingCharge: {
      type: Number,
      required: [true, 'Annealing charge is required'],
      min: [0, 'Annealing charge cannot be negative'],
    },
    drawCharge: {
      type: Number,
      required: [true, 'Draw charge is required'],
      min: [0, 'Draw charge cannot be negative'],
    },
    annealingMax: {
      type: Number,
      required: [true, 'Annealing max is required'],
      min: [1, 'Annealing max must be at least 1'],
      max: [10, 'Annealing max cannot exceed 10'],
      default: 10,
    },
    drawMax: {
      type: Number,
      required: [true, 'Draw max is required'],
      min: [1, 'Draw max must be at least 1'],
      max: [8, 'Draw max cannot exceed 8'],
      default: 8,
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

// Create indexes
PartyMasterSchema.index({ partyName: 1 });
PartyMasterSchema.index({ gstNumber: 1 });

export const PartyMaster = mongoose.models.PartyMaster || mongoose.model<IPartyMaster>('PartyMaster', PartyMasterSchema);
