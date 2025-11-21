import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const LOCAL_STORAGE_LIMIT = 500 * 1024 * 1024; // 500MB

export async function getStorageSize() {
  const publicDir = path.join(process.cwd(), 'public', 'manga');
  if (!fs.existsSync(publicDir)) {
    return 0;
  }
  
  let totalSize = 0;
  const walkDir = (dir) => {
    const files = fs.readdirSync(dir);
    files.forEach((file) => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        walkDir(filePath);
      } else {
        totalSize += stat.size;
      }
    });
  };
  
  walkDir(publicDir);
  return totalSize;
}

export async function saveImage(buffer, mangaId, chapterNumber, pageNumber) {
  try {
    // Try local storage first
    const storageSize = await getStorageSize();
    
    if (storageSize < LOCAL_STORAGE_LIMIT) {
      return await saveImageLocally(buffer, mangaId, chapterNumber, pageNumber);
    } else {
      // Fallback to Cloudinary
      return await saveImageToCloudinary(buffer, mangaId, chapterNumber, pageNumber);
    }
  } catch (error) {
    console.error('Error saving image:', error);
    // Try cloudinary as fallback
    return await saveImageToCloudinary(buffer, mangaId, chapterNumber, pageNumber);
  }
}

export async function saveImageLocally(buffer, mangaId, chapterNumber, pageNumber) {
  const dir = path.join(process.cwd(), 'public', 'manga', mangaId, chapterNumber.toString());
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  const filename = `${pageNumber}.jpg`;
  const filepath = path.join(dir, filename);
  
  // Optimize image with sharp
  await sharp(buffer)
    .jpeg({ quality: 85, progressive: true })
    .resize(1200, null, { withoutEnlargement: true, fit: 'inside' })
    .toFile(filepath);
  
  const imageUrl = `/manga/${mangaId}/${chapterNumber}/${filename}`;
  return { url: imageUrl, storage: 'local' };
}

export async function saveImageToCloudinary(buffer, mangaId, chapterNumber, pageNumber) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `manga/${mangaId}/${chapterNumber}`,
        public_id: `page_${pageNumber}`,
        resource_type: 'image',
        transformation: [
          { width: 1200, crop: 'limit' },
          { quality: 'auto:good' },
        ],
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve({ url: result.secure_url, storage: 'cloudinary' });
        }
      }
    );
    
    uploadStream.end(buffer);
  });
}

export async function saveCoverImage(buffer, mangaId) {
  try {
    const dir = path.join(process.cwd(), 'public', 'manga', mangaId);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const filename = 'cover.jpg';
    const filepath = path.join(dir, filename);
    
    await sharp(buffer)
      .jpeg({ quality: 90, progressive: true })
      .resize(400, 600, { fit: 'cover' })
      .toFile(filepath);
    
    return `/manga/${mangaId}/${filename}`;
  } catch (error) {
    console.error('Error saving cover:', error);
    // Fallback to cloudinary
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `manga/${mangaId}`,
          public_id: 'cover',
          resource_type: 'image',
          transformation: [
            { width: 400, height: 600, crop: 'fill' },
            { quality: 'auto:good' },
          ],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result.secure_url);
        }
      );
      uploadStream.end(buffer);
    });
  }
}
