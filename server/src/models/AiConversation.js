import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['system', 'user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: [4000, 'Message cannot exceed 4000 characters'],
    },
    matchedProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
    toolCalls: [
      {
        toolName: String,
        params: mongoose.Schema.Types.Mixed,
        resultSummary: String,
      },
    ],
    outfitPayload: mongoose.Schema.Types.Mixed,
    comparisonPayload: mongoose.Schema.Types.Mixed,
    feedbackRating: {
      type: Number,
      min: 1,
      max: 5,
    },
  },
  { timestamps: true }
);

const aiConversationSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    title: {
      type: String,
      default: 'WinterWear Style Advisory',
      maxlength: 120,
    },
    messages: [messageSchema],
    metadata: {
      weatherContext: mongoose.Schema.Types.Mixed,
      preferredBudget: Number,
      preferredSize: String,
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

// Expire idle guest conversations after 30 days
aiConversationSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export default mongoose.model('AiConversation', aiConversationSchema);
