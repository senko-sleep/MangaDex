import mongoose from 'mongoose';

const ChapterSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    mangaId: {
      type: String,
      required: true,
      index: true,
    },
    chapterNumber: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
      default: '',
    },
    pageCount: {
      type: Number,
      default: 0,
    },
    pages: [
      {
        pageNumber: Number,
        imageUrl: String,
        width: Number,
        height: Number,
      },
    ],
    views: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

ChapterSchema.index({ mangaId: 1, chapterNumber: 1 }, { unique: true });
ChapterSchema.index({ createdAt: -1 });

export default mongoose.models.Chapter || mongoose.model('Chapter', ChapterSchema);
