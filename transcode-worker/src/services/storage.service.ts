import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { config } from '../config.js';

export class StorageService {
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    this.bucketName = config.aws.s3BucketName;
    this.s3Client = new S3Client({
      region: config.aws.region,
    });
    console.log(`[Storage] Initialized AWS S3 Service for bucket "${this.bucketName}" in region "${config.aws.region}"`);
  }

  async downloadFileToFile(s3Key: string, destinationFilePath: string): Promise<void> {
    const parentDir = path.dirname(destinationFilePath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    console.log(`[Storage] Downloading S3 object: "s3://${this.bucketName}/${s3Key}" -> "${destinationFilePath}"`);

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
    });

    const response = await this.s3Client.send(command);

    if (!response.Body) {
      throw new Error(`Empty body received from S3 for key "${s3Key}"`);
    }

    const fileStream = fs.createWriteStream(destinationFilePath);
    await pipeline(response.Body as Readable, fileStream);
    console.log(`[Storage] Downloaded "${s3Key}" successfully (${fs.statSync(destinationFilePath).size} bytes)`);
  }

  async uploadFile(localFilePath: string, destinationS3Key: string, contentType?: string): Promise<string> {
    const mimeType = contentType || this.getMimeType(localFilePath);
    const fileStream = fs.createReadStream(localFilePath);

    console.log(`[Storage] Uploading: "${localFilePath}" -> "s3://${this.bucketName}/${destinationS3Key}" (${mimeType})`);

    const parallelUploads3 = new Upload({
      client: this.s3Client,
      params: {
        Bucket: this.bucketName,
        Key: destinationS3Key,
        Body: fileStream,
        ContentType: mimeType,
      },
    });

    await parallelUploads3.done();
    return this.getMediaPublicUrl(destinationS3Key);
  }

  async uploadDirectory(localDirPath: string, remotePrefix: string): Promise<void> {
    const files = this.getAllFiles(localDirPath);
    for (const file of files) {
      const relativePath = path.relative(localDirPath, file).replace(/\\/g, '/');
      const s3Key = `${remotePrefix}/${relativePath}`.replace(/\/+/g, '/').replace(/^\//, '');
      await this.uploadFile(file, s3Key);
    }
  }

  getMediaPublicUrl(s3Key: string): string {
    const cleanKey = s3Key.replace(/^\//, '');
    if (config.aws.mediaCdnUrl) {
      const base = config.aws.mediaCdnUrl.replace(/\/$/, '');
      return `${base}/${cleanKey}`;
    }
    return `https://${this.bucketName}.s3.${config.aws.region}.amazonaws.com/${cleanKey}`;
  }

  private getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
    const files = fs.readdirSync(dirPath);
    files.forEach((file) => {
      const fullPath = path.join(dirPath, file);
      if (fs.statSync(fullPath).isDirectory()) {
        this.getAllFiles(fullPath, arrayOfFiles);
      } else {
        arrayOfFiles.push(fullPath);
      }
    });
    return arrayOfFiles;
  }

  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.m3u8':
        return 'application/vnd.apple.mpegurl';
      case '.ts':
        return 'video/MP2T';
      case '.mp4':
        return 'video/mp4';
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      case '.png':
        return 'image/png';
      case '.json':
        return 'application/json';
      default:
        return 'application/octet-stream';
    }
  }
}
