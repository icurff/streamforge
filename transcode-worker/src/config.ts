import dotenv from 'dotenv';
dotenv.config();

export interface Config {
  aws: {
    region: string;
    sqsQueueUrl: string;
    s3BucketName: string;
    s3UploadPrefix: string;
    s3HlsPrefix: string;
    mediaCdnUrl: string;
  };
  database: {
    videosTable: string;
    region: string;
  };
  scratchDir: string;
}

export const config: Config = {
  aws: {
    region: process.env.AWS_REGION || 'ap-southeast-1',
    sqsQueueUrl: process.env.AWS_SQS_QUEUE_URL || 'https://sqs.ap-southeast-1.amazonaws.com/393698973321/streamforge-transcode-queue-dev',
    s3BucketName: process.env.AWS_S3_BUCKET_NAME || 'streamforge-media-dev-393698973321',
    s3UploadPrefix: process.env.AWS_S3_UPLOAD_PREFIX || 'uploads/',
    s3HlsPrefix: process.env.AWS_S3_HLS_PREFIX || 'outputs/',
    mediaCdnUrl: process.env.AWS_MEDIA_CDN_URL || 'https://media.icurff.site',
  },
  database: {
    videosTable: process.env.DYNAMODB_VIDEOS_TABLE || 'streamforge-videos-dev',
    region: process.env.AWS_REGION || 'ap-southeast-1',
  },
  scratchDir: process.env.WORKER_SCRATCH_DIR || '/tmp/streamforge-worker',
};
