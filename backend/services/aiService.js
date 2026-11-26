import axios from 'axios';
import formData from 'form-data';

//When a user uploads an image, the image will be sent from express to the fastAPI url for prediction. The response will be sent back to the user.
export async function predictAnimal(file,endpoint) {
    const formData = new FormData();

    const imageBlob = new Blob([file.buffer], {
        type: file.mimetype
    });

    formData.append('file', imageBlob, file.originalname);

    const response = await axios.post(endpoint, formData, {
        timeout: 30000
    });

    return response.data;
}