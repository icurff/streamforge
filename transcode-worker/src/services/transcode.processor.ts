import fs from 'fs';
import path from 'path';
import { StorageService } from './storage.service.js';
import { DatabaseService } from './database.service.js';
import { FFmpegService } from './ffmpeg.service.js';
import { config } from '../config.js';

export interface TranscodeTask {
  s3Key: string;
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

    // Handle SNS envelope if present
    if (payload?.Type === 'Notification' && payload?.Message) {
      try {
        payload = JSON.parse(payload.Message);
      } catch (e) {
        console.error('[Processor] Failed to parse SNS Message JSON:', payload.Message);
        return null;
      }
    }

    // Ignore S3 TestEvent
    if (payload?.Event === 's3:TestEvent' || payload?.Service === 'Amazon S3') {
      console.log('[Processor] Received and skipped S3 test notification event.');
      return null;
    }

    let s3Key = '';

    // S3 Event notification format: Records[0].s3.object.key
    if (Array.isArray(payload?.Records) && payload.Records.length > 0) {
      const s3Record = payload.Records[0]?.s3;
      if (s3Record?.object?.key) {
        s3Key = decodeURIComponent(s3Record.object.key.replace(/\+/g, ' '));
      }
    } else if (payload?.s3Key) {
      s3Key = payload.s3Key;
    } else if (payload?.blobPath) {
      s3Key = payload.blobPath;
    }

    if (!s3Key) {
      console.warn('[Processor] Ignored message without valid S3 object key:', JSON.stringify(payload));
      return null;
    }

    // Expected pattern: uploads/{username}/{videoId}/{fileName} or raw/{username}/{videoId}/{fileName}
    const cleanKey = s3Key.replace(/^\//, '');
    const segments = cleanKey.split('/');

    if (segments.length < 4) {
      console.warn(`[Processor] S3 key "${cleanKey}" does not match prefix/username/videoId/fileName pattern. Skipping.`);
      return null;
    }

    const username = segments[1];
    const videoId = segments[2];
    const fileName = segments.slice(3).join('/');

    return {
      s3Key: cleanKey,
      username,
      videoId,
      fileName,
    };
  }

  async processTask(task: TranscodeTask): Promise<void> {
    console.log(`\n========================================`);
    console.log(`[Processor] Starting transcode task for VideoId: ${task.videoId}`);
    console.log(`[Processor] User: ${task.username}, File: ${task.fileName}`);
    console.log(`[Processor] S3 Source Key: "${task.s3Key}"`);
    console.log(`========================================`);

    const workDir = path.join(config.scratchDir, task.videoId);
    const rawLocalPath = path.join(workDir, 'raw', task.fileName);
    const outputLocalDir = path.join(workDir, 'outputs');

    try {
      // 1. Download raw file from AWS S3
      await this.storageService.downloadFileToFile(task.s3Key, rawLocalPath);

      // 2. FFmpeg transcode into multi-bitrate HLS + master playlist (master.m3u8)
      const result = await this.ffmpegService.transcodeToHLS(rawLocalPath, outputLocalDir, 'stream');

      // 3. Upload transcoded HLS stream files to AWS S3
      // Target prefix: outputs/{username}/{videoId}/
      const remoteOutputPrefix = `outputs/${task.username}/${task.videoId}`;
      console.log(`[Processor] Uploading HLS directory to S3: "${remoteOutputPrefix}"`);
      await this.storageService.uploadDirectory(outputLocalDir, remoteOutputPrefix);

      // 4. Update DynamoDB document with resolutions and duration
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
