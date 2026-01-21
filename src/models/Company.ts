import mongoose from 'mongoose';

const CompanySchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
    },
    registeredOffice: {
      type: String,
      required: true,
    },
    cin: {
      type: String,
      required: true,
      trim: true,
    },
    gstin: {
      type: String,
      required: true,
      trim: true,
    },
    pan: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      required: true,
      default: 'Gujarat',
    },
    stateCode: {
      type: String,
      required: true,
      default: '24',
    },
    contactNumber: {
      type: String,
    },
    email: {
      type: String,
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

export default mongoose.models.Company || mongoose.model('Company', CompanySchema);
