import { Router, Request, Response } from 'express';
import multer from 'multer';
import cloudinary from '../lib/cloudinary';
import authMiddleware from '../middleware/authMiddleware';

const router = Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const imageUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

const videoUpload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for hero clips
  fileFilter: (req, file, cb) => {
    const ok =
      file.mimetype === 'video/mp4' ||
      file.mimetype === 'video/webm' ||
      file.mimetype === 'video/quicktime';
    if (ok) cb(null, true);
    else cb(new Error('Only MP4, WebM, or MOV video files are allowed'));
  },
});

// POST /api/upload/image - upload image to Cloudinary (protected)
router.post('/image', authMiddleware, imageUpload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    // Upload to Cloudinary
    const result = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'sowaat-menswear',
          transformation: [
            { width: 800, height: 1000, crop: 'limit' },
            { quality: 'auto', fetch_format: 'auto' },
          ],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(req.file!.buffer);
    });

    res.json({
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
    });
  } catch (error) {
    res.status(500).json({ message: 'Upload failed', error: (error as Error).message });
  }
});

// POST /api/upload/video - hero / reel-style MP4 (protected)
router.post('/video', authMiddleware, videoUpload.single('video'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No video file provided' });
    }

    const result = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'sowaat-menswear/hero-videos',
          resource_type: 'video',
          format: 'mp4',
        },
        (error, uploadResult) => {
          if (error) reject(error);
          else resolve(uploadResult);
        }
      );
      uploadStream.end(req.file!.buffer);
    });

    res.json({
      url: result.secure_url,
      publicId: result.public_id,
      duration: result.duration,
    });
  } catch (error) {
    res.status(500).json({ message: 'Upload failed', error: (error as Error).message });
  }
});

export default router;
