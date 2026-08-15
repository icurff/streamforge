import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { config } from '../config.js';

export class DatabaseService {
  private docClient: DynamoDBDocumentClient | null = null;

  async connect(): Promise<void> {
    if (this.docClient) return;

    console.log(`[Database] Connecting to DynamoDB (Region: ${config.database.region})...`);
    const ddbClient = new DynamoDBClient({ region: config.database.region });
    this.docClient = DynamoDBDocumentClient.from(ddbClient);
    console.log(`[Database] Connected to DynamoDB. Table: ${config.database.videosTable}`);
  }

  async updateVideoTranscodeComplete(
    videoId: string,
    resolutions: string[],
    duration?: number
  ): Promise<void> {
    if (!this.docClient) {
      await this.connect();
    }

    // Convert string array ["720p", "480p", "360p"] or ["720", "480", "360"] to DynamoDB string set
    // Spring Boot enum EVideoResolution uses P720, P480, P360
    const formattedResolutions = resolutions.map((r) => {
      const num = r.replace(/[^0-9]/g, '');
      return `P${num}`;
    });

    let updateExpression = 'SET #res = :res, #lastModified = :lastModified';
    const expressionAttributeNames: Record<string, string> = {
      '#res': 'resolutions',
      '#lastModified': 'lastModifiedDate',
    };
    const expressionAttributeValues: Record<string, any> = {
      ':res': new Set(formattedResolutions),
      ':lastModified': new Date().toISOString(),
    };

    if (duration !== undefined && duration > 0) {
      updateExpression += ', #duration = :duration';
      expressionAttributeNames['#duration'] = 'duration';
      expressionAttributeValues[':duration'] = Math.round(duration);
    }

    const command = new UpdateCommand({
      TableName: config.database.videosTable,
      Key: { id: videoId },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    });

    try {
      await this.docClient!.send(command);
      console.log(`[Database] Video record updated in DynamoDB for id=${videoId} with resolutions=[${formattedResolutions.join(', ')}]`);
    } catch (err: any) {
      console.error(`[Database Error] Failed to update DynamoDB for videoId=${videoId}:`, err.message);
    }
  }

  async close(): Promise<void> {
    this.docClient = null;
  }
}
