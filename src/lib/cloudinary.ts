import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

function configureCloudinary() {
  const url = process.env.CLOUDINARY_URL;
  if (!url) {
    throw new Error("CLOUDINARY_URL is not set");
  }

  const match = url.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
  if (!match) {
    throw new Error("CLOUDINARY_URL is invalid");
  }

  cloudinary.config({
    api_key: decodeURIComponent(match[1]),
    api_secret: decodeURIComponent(match[2]),
    cloud_name: match[3],
    secure: true,
  });
}

export async function uploadInspectionImage(buffer: Buffer): Promise<UploadApiResponse> {
  configureCloudinary();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "prenit-inspections",
        resource_type: "image",
      },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error("Cloudinary upload failed"));
          return;
        }
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}
