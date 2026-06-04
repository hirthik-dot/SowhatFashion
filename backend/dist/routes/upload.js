"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const cloudinary_1 = __importDefault(require("../lib/cloudinary"));
const authMiddleware_1 = __importDefault(require("../middleware/authMiddleware"));
const router = (0, express_1.Router)();
// Configure multer for memory storage
const storage = multer_1.default.memoryStorage();
const imageUpload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Only image files are allowed'));
        }
    },
});
const videoUpload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for hero clips
    fileFilter: (req, file, cb) => {
        const ok = file.mimetype === 'video/mp4' ||
            file.mimetype === 'video/webm' ||
            file.mimetype === 'video/quicktime';
        if (ok)
            cb(null, true);
        else
            cb(new Error('Only MP4, WebM, or MOV video files are allowed'));
    },
});
// POST /api/upload/image - upload image to Cloudinary (protected)
router.post('/image', authMiddleware_1.default, imageUpload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No image file provided' });
        }
        // Upload to Cloudinary
        const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary_1.default.uploader.upload_stream({
                folder: 'sowaat-menswear',
                transformation: [
                    { width: 800, height: 1000, crop: 'limit' },
                    { quality: 'auto', fetch_format: 'auto' },
                ],
            }, (error, result) => {
                if (error)
                    reject(error);
                else
                    resolve(result);
            });
            uploadStream.end(req.file.buffer);
        });
        res.json({
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Upload failed', error: error.message });
    }
});
// POST /api/upload/video - hero / reel-style MP4 (protected)
router.post('/video', authMiddleware_1.default, videoUpload.single('video'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No video file provided' });
        }
        const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary_1.default.uploader.upload_stream({
                folder: 'sowaat-menswear/hero-videos',
                resource_type: 'video',
                format: 'mp4',
            }, (error, uploadResult) => {
                if (error)
                    reject(error);
                else
                    resolve(uploadResult);
            });
            uploadStream.end(req.file.buffer);
        });
        res.json({
            url: result.secure_url,
            publicId: result.public_id,
            duration: result.duration,
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Upload failed', error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=upload.js.map