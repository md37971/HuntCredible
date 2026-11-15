import express from 'express'
import multer from 'multer'; //Handling image uploads with multer.
import upload from '../middleware/uploadMiddleware.js'; //Custom middleware for handling image uploads.
import { predictAnimal } from '../services/aiService.js'; //Function to send the image to the FastAPI server to the prediction method aiService.js

const router = express.Router();

//On bruno, make sure to set Key for "image" for the multipart form to "File" and select an image file to upload.
router.post('/', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            statusCode: 400,
            statusMessage: 'Bad Request',
            content: {
                message: 'An image is required.'
            }
        });
    }

    try {
        const result = await predictAnimal(req.file); //Send file to the predict animal function.

        res.status(200).json({
            statusCode: 200,
            statusMessage: 'OK',
            content: result
        });

    } catch (error) {
        //console.error('AI service error:', error.message);
        console.error('AI service error:', error.response?.data || error.message);

        res.status(502).json({
            statusCode: 502,
            statusMessage: 'Bad Gateway',
            content: {
                message: 'Unable to process image through the AI service.'
            }
        });
    }
});

router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') { //File size exceeds the limit set in the multer middleware.
            return res.status(413).json({
                statusCode: 413,
                statusMessage: 'Payload Too Large',
                content: {
                    message: 'Image must not exceed 15 MB.'
                }
            });
        }
    }

    if (err) { //Other errors that occur.
        return res.status(400).json({
            statusCode: 400,
            statusMessage: 'Bad Request',
            content: {
                message: err.message
            }
        });
    }

    next();
});

export default router;