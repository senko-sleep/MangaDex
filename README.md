# MangaDex - Complete Manga Website System

A production-ready manga reading platform built with Next.js 14, MongoDB, and modern web technologies.

## 🚀 Features

### Public Website
- **Homepage**: Browse latest manga updates with pagination
- **Search & Filter**: Fuzzy search with genre filters, hentai toggle, and status filters
- **Manga Detail Page**: View manga information, chapters, tags, and statistics
- **Chapter Reader**: Beautiful image viewer with navigation controls
- **Responsive Design**: Mobile-friendly UI with dark theme support
- **SEO Optimized**: Server-side rendering with proper metadata

### Admin Panel
- **Secure Authentication**: NextAuth.js with JWT-based sessions
- **Manga Management**: Create, edit, and delete manga entries
- **Chapter Upload**: ZIP/CBZ file upload with automatic image extraction
- **Dashboard**: View statistics (manga count, chapter count, total views)
- **Image Optimization**: Automatic image compression and optimization
- **Dual Storage**: Local filesystem + Cloudinary fallback

### REST API
- `GET /api/manga` - List manga with pagination and filters
- `GET /api/manga/:id` - Get manga details
- `GET /api/manga/:id/chapters` - Get chapters for a manga
- `GET /api/manga/:id/chapters/:chapterId` - Get chapter with pages
- `GET /api/search?q=` - Search manga
- `GET /api/stats` - Get statistics
- `POST /api/manga` - Create new manga (admin)
- `POST /api/manga/:id/chapters` - Upload chapter (admin)
- `DELETE /api/manga/:id` - Delete manga (admin)

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TailwindCSS
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Backend**: Next.js API Routes, Node.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: NextAuth.js with credentials provider
- **Image Processing**: Sharp for optimization
- **Image Storage**: Local filesystem + Cloudinary
- **File Handling**: AdmZip for ZIP/CBZ extraction
- **TypeScript**: Full type safety (converted to JavaScript for this version)

## 📁 Project Structure

```
/app/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.js    # NextAuth configuration
│   │   └── [[...path]]/route.js           # Main API routes
│   ├── manga/
│   │   └── [id]/
│   │       ├── page.js                     # Manga detail page
│   │       └── [chapterId]/page.js         # Chapter reader
│   ├── admin/
│   │   ├── page.js                         # Admin dashboard
│   │   ├── login/page.js                   # Admin login
│   │   ├── upload/page.js                  # Upload interface
│   │   └── manage/page.js                  # Manage manga
│   ├── page.js                             # Homepage
│   ├── layout.js                           # Root layout
│   └── globals.css                         # Global styles
├── components/
│   ├── ui/                                 # shadcn/ui components
│   └── providers/
│       └── session-provider.js             # NextAuth provider
├── lib/
│   ├── mongodb.js                          # MongoDB connection
│   ├── auth.js                             # Authentication utilities
│   ├── imageStorage.js                     # Image storage handler
│   └── models/
│       ├── User.js                         # User model
│       ├── Manga.js                        # Manga model
│       └── Chapter.js                      # Chapter model
├── hooks/
│   └── use-toast.js                        # Toast notification hook
├── public/
│   └── manga/                              # Local manga storage
├── .env                                    # Environment variables
└── package.json                            # Dependencies
```

## 🔧 Installation & Setup

### Prerequisites
- Node.js 18+ 
- MongoDB Atlas account or local MongoDB
- Cloudinary account (optional, for image backup)

### Environment Variables

Create or update `.env` file:

```env
# MongoDB Configuration
MONGO_URL=mongodb+srv://foxboteevee_db_user:senko@mangadex.l6ao6gx.mongodb.net/?appName=MangaDex
DB_NAME=mangadex

# NextAuth Configuration
NEXTAUTH_SECRET=your-super-secret-nextauth-key-change-in-production
NEXTAUTH_URL=https://your-domain.com

# Cloudinary Configuration (Optional)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Base URL
NEXT_PUBLIC_BASE_URL=https://your-domain.com
CORS_ORIGINS=*
```

### Installation Steps

1. **Install Dependencies**
```bash
yarn install
```

2. **Start Development Server**
```bash
yarn dev
```

3. **Build for Production**
```bash
yarn build
yarn start
```

## 👤 Default Admin Credentials

- **Email**: admin@example.com
- **Password**: SecurePassword123!

⚠️ **IMPORTANT**: Change these credentials after first login!

## 📚 How to Use

### Adding Manga

1. Navigate to `/admin` and login
2. Click "Add New Manga"
3. Fill in manga details:
   - Title (required)
   - Description
   - Author & Artist
   - Genres (comma-separated)
   - Tags (comma-separated)
   - Status (ongoing/completed/hiatus/cancelled)
   - 18+ Content toggle
   - Cover image
4. Click "Create Manga"

### Uploading Chapters

1. Go to "Upload Content" page
2. Select the manga from dropdown
3. Enter chapter number (e.g., 1, 1.5, 2)
4. Add optional chapter title
5. Upload ZIP/CBZ file containing manga pages
6. Click "Upload Chapter"

**ZIP File Requirements**:
- Should contain only image files (JPG, PNG, WebP, GIF)
- Images will be sorted alphabetically
- Recommended naming: 001.jpg, 002.jpg, etc.
- All images will be automatically optimized

### Image Storage Strategy

**Local Storage** (Primary):
- Images stored in `/public/manga/{mangaId}/{chapterNumber}/`
- Fast access, no API limits
- Automatic when storage < 500MB

**Cloudinary** (Fallback):
- Activates when local storage exceeds 500MB
- Also used as backup if local storage fails
- Automatic image optimization and CDN delivery

## 🗄️ Database Schema

### Manga Model
```javascript
{
  id: String (UUID),
  title: String,
  altTitles: [String],
  description: String,
  tags: [String],
  genres: [String],
  isHentai: Boolean,
  status: String,
  coverUrl: String,
  author: String,
  artist: String,
  chapterCount: Number,
  views: Number,
  rating: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### Chapter Model
```javascript
{
  id: String (UUID),
  mangaId: String,
  chapterNumber: Number,
  title: String,
  pageCount: Number,
  pages: [{
    pageNumber: Number,
    imageUrl: String,
    width: Number,
    height: Number
  }],
  views: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### User Model
```javascript
{
  email: String,
  password: String (hashed),
  role: String (admin/user),
  createdAt: Date,
  updatedAt: Date
}
```

## 🚀 Deployment

### Using Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn build

EXPOSE 3000

CMD ["yarn", "start"]
```

### Using Supervisor (Current Setup)

The app is already configured with supervisor for process management:

```bash
# Restart service
sudo supervisorctl restart nextjs

# Check status
sudo supervisorctl status nextjs

# View logs
tail -f /var/log/supervisor/nextjs.out.log
tail -f /var/log/supervisor/nextjs.err.log
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /manga/ {
        alias /app/public/manga/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

## 🔒 Security Considerations

1. **Change default admin credentials** immediately
2. **Use strong NEXTAUTH_SECRET** in production
3. **Enable HTTPS** for production deployment
4. **Configure CORS** properly for your domain
5. **Implement rate limiting** for API routes
6. **Add file size limits** for uploads
7. **Validate and sanitize** all user inputs
8. **Regular backups** of MongoDB database

## 🎨 Customization

### Changing Colors

Edit `tailwind.config.js` or `globals.css` to customize the color scheme.

### Adding Features

1. **User Registration**: Extend User model and add registration route
2. **Comments System**: Create Comment model and API routes
3. **Favorites**: Add favorites field to User model
4. **Reading History**: Track user reading progress
5. **Ratings**: Implement rating system for manga

## 📝 API Examples

### Get Latest Manga
```bash
curl "https://your-domain.com/api/manga?page=1&sortBy=updatedAt&order=desc"
```

### Search Manga
```bash
curl "https://your-domain.com/api/search?q=naruto&includeHentai=false"
```

### Get Manga Details
```bash
curl "https://your-domain.com/api/manga/{manga-id}"
```

### Get Chapter
```bash
curl "https://your-domain.com/api/manga/{manga-id}/chapters/{chapter-id}"
```

## 🐛 Troubleshooting

### Images Not Loading
- Check file permissions on `/public/manga/` directory
- Verify Cloudinary credentials if using fallback
- Check browser console for 404 errors

### Upload Fails
- Ensure ZIP file contains only images
- Check file size limits (default: 50MB)
- Verify write permissions on public directory

### MongoDB Connection Issues
- Verify MONGO_URL is correct
- Check network connectivity to MongoDB Atlas
- Ensure database user has proper permissions

### NextAuth Errors
- Verify NEXTAUTH_SECRET is set
- Check NEXTAUTH_URL matches your domain
- Clear browser cookies and try again

## 📄 License

MIT License - Feel free to use this project for any purpose.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit pull requests.

## 📞 Support

For issues and questions, please create an issue in the repository.

---

**Built with ❤️ using Next.js, MongoDB, and modern web technologies**
