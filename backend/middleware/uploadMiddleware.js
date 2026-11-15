//This middleware is used to handle file uploads in the application. It uses the multer library to process incoming files and store them in memory.
import multer from 'multer';

const storage = multer.memoryStorage();

const allowedTypes = ['image/jpeg', 'image/png', 'image/webp','image/webp','image/heic','image/heif'];

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 15 * 1024 * 1024 // 15MB Image file limit.
    },
    fileFilter: (req, file, cb) => {
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Images must be in jpeg, png, webp, heic, or heif format'));
        }
    }
});

export default upload;