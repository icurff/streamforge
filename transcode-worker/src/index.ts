import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  ChangeMessageVisibilityCommand,
} from '@aws-sdk/client-sqs';
import { config } from './config.js';
import { StorageService } from './services/storage.service.js';
import { DatabaseService } from './services/database.service.js';
import { FFmpegService } from './services/ffmpeg.service.js';
import { TranscodeProcessor } from './services/transcode.processor.js';

let isRunning = true;

async function main() {
  console.log('----------------------------------------------------');
  console.log('StreamForge Event-Driven Transcode Worker (AWS SQS/S3)');
  console.log('----------------------------------------------------');
  console.log(`AWS Region: ${config.aws.region}`);
  console.log(`SQS Queue URL: ${config.aws.sqsQueueUrl}`);
  console.log(`S3 Bucket: ${config.aws.s3BucketName}`);
  console.log(`DynamoDB Table: ${config.database.videosTable}`);
  console.log(`Scratch Directory: ${config.scratchDir}`);

  // Initialize services
  const storageService = new StorageService();
  const databaseService = new DatabaseService();
  await databaseService.connect();

  const ffmpegService = new FFmpegService();
  const processor = new TranscodeProcessor(storageService, databaseService, ffmpegService);

  // Initialize AWS SQS Client
  const sqsClient = new SQSClient({ region: config.aws.region });

  console.log(`[Worker] Listening for messages from SQS: "${config.aws.sqsQueueUrl}"...`);

  // Polling loop
  while (isRunning) {
    try {
      const receiveCommand = new ReceiveMessageCommand({
        QueueUrl: config.aws.sqsQueueUrl,
        MaxNumberOfMessages: 1,
        WaitTimeSeconds: 20, // Long polling
        VisibilityTimeout: 600, // 10 minutes for transcoding
      });

      const response = await sqsClient.send(receiveCommand);

      if (!response.Messages || response.Messages.length === 0) {
        continue;
      }

      for (const message of response.Messages) {
        if (!message.ReceiptHandle || !message.Body) continue;

        console.log(`\n[SQS] Received message ID: ${message.MessageId}`);

        const task = processor.parseMessage(message.Body);
        if (!task) {
          console.log(`[SQS] Message ${message.MessageId} does not require transcoding. Deleting from queue.`);
          await sqsClient.send(
            new DeleteMessageCommand({
              QueueUrl: config.aws.sqsQueueUrl,
              ReceiptHandle: message.ReceiptHandle,
            })
          );
          continue;
        }

        try {
          await processor.processTask(task);

          // Delete message upon successful transcode
          await sqsClient.send(
            new DeleteMessageCommand({
              QueueUrl: config.aws.sqsQueueUrl,
              ReceiptHandle: message.ReceiptHandle,
            })
          );
          console.log(`[SQS] Message ${message.MessageId} processed and deleted from queue successfully.`);
        } catch (err: any) {
          console.error(`[SQS Error] Error processing message ${message.MessageId}:`, err);
          // Make visible again immediately for retry or let visibility timeout expire
          try {
            await sqsClient.send(
              new ChangeMessageVisibilityCommand({
                QueueUrl: config.aws.sqsQueueUrl,
                ReceiptHandle: message.ReceiptHandle,
                VisibilityTimeout: 0,
              })
            );
          } catch (visErr) {
            console.warn('[SQS] Failed resetting visibility timeout:', visErr);
          }
        }
      }
    } catch (err: any) {
      if (!isRunning) break;
      console.error('[Worker Loop Error]', err.message || err);
      // Brief sleep before retrying
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  console.log('[Worker] Worker loop stopped.');
}

// Graceful shutdown
const shutdown = async () => {
  console.log('\n[Worker] Shutting down transcode worker gracefully...');
  isRunning = false;
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

main().catch((err) => {
  console.error('[Worker Fatal Error]', err);
  process.exit(1);
});
