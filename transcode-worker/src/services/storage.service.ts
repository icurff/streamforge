import { BlobServiceClient, ContainerClient, BlockBlobClient } from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';
import fs from 'fs';
import path from 'path';
import { config } from '../config.js';

export class StorageService {
  private blobServiceClient: BlobServiceClient;
  private containerClient: ContainerClient;

  constructor() {
    if (config.storage.connectionString) {
      this.blobServiceClient = BlobServiceClient.fromConnectionString(config.storage.connectionString);
    } else if (config.storage.accountName) {
      const endpoint = `https://${config.storage.accountName}.blob.core.windows.net`;
      const credential = new DefaultAzureCredential();
      this.blobServiceClient = new BlobServiceClient(endpoint, credential);
    } else {
      // Local Azurite emulator fallback
      const endpoint = 'http://127.0.0.1:10000/devstoreaccount1';
      this.blobServiceClient = new BlobServiceClient(endpoint);
    }

    this.containerClient = this.blobServiceClient.getContainerClient(config.storage.containerName);
  }

  async ensureContainer(): Promise<void> {
    await this.containerClient.createIfNotExists();
  }

  async downloadBlobToFile(blobPath: string, destinationFilePath: string): Promise<void> {
    const parentDir = path.dirname(destinationFilePath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    const blobClient = this.containerClient.getBlobClient(blobPath);
    console.log(`[Storage] Downloading blob: "${blobPath}" -> "${destinationFilePath}"`);
    await blobClient.downloadToFile(destinationFilePath);
  }

  async uploadFile(localFilePath: string, destinationBlobPath: string, contentType?: string): Promise<string> {
    const blockBlobClient = this.containerClient.getBlockBlobClient(destinationBlobPath);
    const mimeType = contentType || this.getMimeType(localFilePath);

    console.log(`[Storage] Uploading file: "${localFilePath}" -> "${destinationBlobPath}" (${mimeType})`);
    await blockBlobClient.uploadFile(localFilePath, {
      blobHTTPHeaders: {
        blobContentType: mimeType,
      },
    });

    return this.getBlobPublicUrl(destinationBlobPath);
  }

  async uploadDirectory(localDirPath: string, remotePrefix: string): Promise<void> {
    const files = this.getAllFiles(localDirPath);
    for (const file of files) {
      const relativePath = path.relative(localDirPath, file).replace(/\\/g, '/');
      const blobPath = `${remotePrefix}/${relativePath}`.replace(/\/+/g, '/');
      await this.uploadFile(file, blobPath);
    }
  }

  getBlobPublicUrl(blobPath: string): string {
    if (config.storage.mediaCdnUrl) {
      const base = config.storage.mediaCdnUrl.replace(/\/$/, '');
      return `${base}/${config.storage.containerName}/${blobPath}`;
    }
    if (config.storage.publicBaseUrl) {
      const base = config.storage.publicBaseUrl.replace(/\/$/, '');
      return `${base}/${blobPath}`;
    }
    if (config.storage.accountName) {
      return `https://${config.storage.accountName}.blob.core.windows.net/${config.storage.containerName}/${blobPath}`;
    }
    return this.containerClient.getBlobClient(blobPath).url;
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
