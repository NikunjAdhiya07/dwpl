import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['SUPER_ADMIN', 'USER'], default: 'USER' },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

// Clear cached model to force recompilation of the schema during hot-reloads
if (mongoose.models.User) {
  delete mongoose.models.User;
}

export const User = mongoose.model('User', userSchema);
