import mongoose from 'mongoose';

const MangaSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
    },
    altTitles: [String],
    description: {
      type: String,
      default: '',
    },
    tags: [String],
    genres: [String],
    isHentai: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['ongoing', 'completed', 'hiatus', 'cancelled'],
      default: 'ongoing',
    },
    coverUrl: {
      type: String,
      default: '',
    },
    author: {
      type: String,
      default: '',
    },
    artist: {
      type: String,
      default: '',
    },
    chapterCount: {
      type: Number,
      default: 0,
    },
    views: {
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

MangaSchema.index({ title: 'text', description: 'text', tags: 'text' });
MangaSchema.index({ updatedAt: -1 });
MangaSchema.index({ isHentai: 1 });

export default mongoose.models.Manga || mongoose.model('Manga', MangaSchema);
