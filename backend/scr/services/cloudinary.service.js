import { cloudinary } from '../config/cloudinary.js';
import { env } from '../config/env.js';

export const uploadImage = async (fileBuffer, mimetype, folder = env.CLOUDINARY_UPLOAD_FOLDER) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error) return reject(new Error(error.message));
        resolve({ url: result.secure_url, public_id: result.public_id });
      }
    );
    uploadStream.end(fileBuffer);
  });
};

export const deleteImage = async (publicId) => {
  const result = await cloudinary.uploader.destroy(publicId);
  if (result.result !== 'ok') throw new Error('No se pudo eliminar la imagen');
};
