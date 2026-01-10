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
ItemMasterSchema.pre('save', async function () {
  if (!this.itemCode) {
    // Generate serial item code: A0001, A0002, etc.
    const ItemMasterModel = this.constructor as any;
    const lastItem = await ItemMasterModel.findOne({}, {}, { sort: { createdAt: -1 } });
    
    let nextNumber = 1;
    if (lastItem && lastItem.itemCode) {
      // Extract number from last item code (e.g., "A0001" -> 1)
      const match = lastItem.itemCode.match(/A(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }
    
    // Format as A0001, A0002, etc. (padded to 4 digits)
    this.itemCode = `A${nextNumber.toString().padStart(4, '0')}`;
  }
});

// Create compound index for uniqueness (category, size, grade must be unique together)
ItemMasterSchema.index({ category: 1, size: 1, grade: 1 }, { unique: true });
ItemMasterSchema.index({ hsnCode: 1 });

export const ItemMaster = mongoose.models.ItemMaster || mongoose.model<IItemMaster>('ItemMaster', ItemMasterSchema);

