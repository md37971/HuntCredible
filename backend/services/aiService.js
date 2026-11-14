import axios from 'axios';
import formData from 'form-data';

//const FASTAPI_URL = 'http://127.0.0.1:8000/predict';
//const FASTAPI_URL = 'http://host.docker.internal:8000/predict';
const FASTAPI_URL = 'http://ai-service:8000/predict';


//When a user uploads an image, the image will be sent from express to the fastAPI url for prediction. The response will be sent back to the user.
export async function predictAnimal(file) {
    const formData = new FormData();

    const imageBlob = new Blob([file.buffer], {
        type: file.mimetype
    });

    formData.append('file', imageBlob, file.originalname);

    const response = await axios.post(FASTAPI_URL, formData, {
        timeout: 30000
    });

    return response.data;
}