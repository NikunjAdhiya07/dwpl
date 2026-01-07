import mongoose, { Schema } from 'mongoose';
import { IItemMaster } from '@/types';

const ItemMasterSchema = new Schema<IItemMaster>(
  {
    itemCode: {
      type: String,
      unique: true,
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: ['RM', 'FG'],
        message: 'Category must be either RM (Raw Material) or FG (Finished Good)',
      },
    },
    size: {
      type: String,
      required: [true, 'Size/Diameter is required'],
      trim: true,
    },
    grade: {
      type: String,
      required: [true, 'Grade is required'],
      trim: true,
    },
    hsnCode: {
      type: String,
      required: [true, 'HSN Code is required'],
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

// Auto-generate itemCode before saving
ItemMasterSchema.pre('save', function () {
  if (!this.itemCode) {
    // Generate unique item code: CATEGORY-SIZE-GRADE-TIMESTAMP
    const timestamp = Date.now().toString(36).toUpperCase();
    this.itemCode = `${this.category}-${this.size.replace(/[^a-zA-Z0-9]/g, '')}-${this.grade.replace(/[^a-zA-Z0-9]/g, '')}-${timestamp}`;
  }
});

// Create compound index for uniqueness (category, size, grade must be unique together)
ItemMasterSchema.index({ category: 1, size: 1, grade: 1 }, { unique: true });
ItemMasterSchema.index({ hsnCode: 1 });
ItemMasterSchema.index({ itemCode: 1 }, { unique: true });

export const ItemMaster = mongoose.models.ItemMaster || mongoose.model<IItemMaster>('ItemMaster', ItemMasterSchema);

