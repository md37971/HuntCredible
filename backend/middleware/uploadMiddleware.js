//This middleware is used to handle file uploads in the application. It uses the multer library to process incoming files and store them in memory.
import multer from 'multer';
import path from 'path';

const storage = multer.memoryStorage();
const allowedTypes = ['image/jpeg', 'image/png', 'image/webp','image/heic', 'image/heif'];
const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'];

const upload = multer({
    storage,
    limits: {
        fileSize: 15 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        const extension = path.extname(file.originalname).toLowerCase();

        if (allowedTypes.includes(file.mimetype) || (file.mimetype === 'application/octet-stream' && allowedExtensions.includes(extension))) {
            cb(null, true);
        } else {
            cb(new Error(
                'Uploaded file must be an image in these formats: JPG, JPEG, PNG, WEBP, HEIC, or HEIF.'
            ));
        }
    }
});

export default upload;