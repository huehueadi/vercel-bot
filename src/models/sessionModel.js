import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  chatCount: { type: Number, default: 0 },
  lastActivity: { type: Date, default: Date.now },
  chats: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Chat' }]
});

export default mongoose.model('Session', sessionSchema);
