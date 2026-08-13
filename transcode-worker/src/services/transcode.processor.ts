import fs from 'fs';
import path from 'path';
import { StorageService } from './storage.service.js';
import { DatabaseService } from './database.service.js';
import { FFmpegService } from './ffmpeg.service.js';
import { config } from '../config.js';

export interface TranscodeTask {
  blobPath: string;
  username: string;
  videoId: string;
  fileName: string;
}

export class TranscodeProcessor {
  private storageService: StorageService;
  private databaseService: DatabaseService;
  private ffmpegService: FFmpegService;

  constructor(
    storageService: StorageService,
    databaseService: DatabaseService,
    ffmpegService: FFmpegService
  ) {
    this.storageService = storageService;
    this.databaseService = databaseService;
    this.ffmpegService = ffmpegService;
  }

  parseMessage(messageBody: any): TranscodeTask | null {
    let payload = messageBody;
    if (typeof messageBody === 'string') {
      try {
        payload = JSON.parse(messageBody);
      } catch (e) {
        console.error('[Processor] Failed to parse message JSON string:', messageBody);
        return null;
      }
    }

    // Case 1: Event Grid Storage Event (Array or Object)
    if (Array.isArray(payload) && payload.length > 0) {
      payload = payload[0];
    }

    let blobPath = '';
    if (payload?.subject) {
      // Format: /blobServices/default/containers/vod-container/blobs/raw/username/videoId/filename.mp4
      const match = payload.subject.match(/blobs\/(.+)$/);
      if (match) {
        blobPath = match[1];
      }
    } else if (payload?.data?.url) {
      const url = new URL(payload.data.url);
      // Remove container name prefix from pathname: /vod-container/raw/user/id/file
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length > 1) {
        blobPath = parts.slice(1).join('/');
      }
    } else if (payload?.blobPath) {
      blobPath = payload.blobPath;
    }

    if (!blobPath || !blobPath.startsWith('raw/')) {
      console.warn(`[Processor] Ignored message with non-raw blob path: "${blobPath}"`);
      return null;
    }

    // Pattern: raw/{username}/{videoId}/{fileName}
    const segments = blobPath.split('/');
    if (segments.length < 4) {
      console.error(`[Processor] Unexpected blob path structure: "${blobPath}"`);
      return null;
    }

    const username = segments[1];
    const videoId = segments[2];
    const fileName = segments.slice(3).join('/');

    return {
      blobPath,
      username,
      videoId,
      fileName,
    };
  }

  async processTask(task: TranscodeTask): Promise<void> {
    console.log(`\n========================================`);
    console.log(`[Processor] Starting transcode task for VideoId: ${task.videoId}`);
    console.log(`[Processor] User: ${task.username}, File: ${task.fileName}`);
    console.log(`========================================`);

    const workDir = path.join(config.scratchDir, task.videoId);
    const rawLocalPath = path.join(workDir, 'raw', task.fileName);
    const outputLocalDir = path.join(workDir, 'outputs');

    try {
      // 1. Download raw file from Azure Blob Storage
      await this.storageService.downloadBlobToFile(task.blobPath, rawLocalPath);

      // 2. FFmpeg transcode into multi-bitrate HLS + master playlist
      const result = await this.ffmpegService.transcodeToHLS(rawLocalPath, outputLocalDir, 'qmh');

      // 3. Upload transcoded HLS stream files to Azure Blob Storage
      // Target blob prefix: outputs/{username}/{videoId}/
      const remoteOutputPrefix = `outputs/${task.username}/${task.videoId}`;
      console.log(`[Processor] Uploading HLS directory to: "${remoteOutputPrefix}"`);
      await this.storageService.uploadDirectory(outputLocalDir, remoteOutputPrefix);

      // 4. Update MongoDB document with resolutions and duration
      await this.databaseService.updateVideoTranscodeComplete(
        task.videoId,
        result.resolutions,
        result.duration
      );

      console.log(`[Processor] Transcode task completed successfully for videoId=${task.videoId}`);
    } finally {
      // Clean up scratch files
      if (fs.existsSync(workDir)) {
        try {
          fs.rmSync(workDir, { recursive: true, force: true });
          console.log(`[Processor] Cleaned up temporary directory: ${workDir}`);
        } catch (e: any) {
          console.warn(`[Processor] Failed cleaning workDir: ${e.message}`);
        }
      }
    }
  }
}
