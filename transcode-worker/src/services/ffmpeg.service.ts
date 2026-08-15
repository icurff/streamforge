import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';

export interface VideoMetadata {
  width: number;
  height: number;
  duration: number;
}

export interface TranscodeResult {
  resolutions: string[];
  outputDir: string;
  duration: number;
}

export class FFmpegService {
  async getVideoMetadata(videoPath: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          return reject(new Error(`Failed to probe video: ${err.message}`));
        }

        const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
        if (!videoStream) {
          return reject(new Error('No video stream found in file'));
        }

        const width = videoStream.width || 0;
        const height = videoStream.height || 0;
        const duration = Math.round(Number(metadata.format.duration || videoStream.duration || 0));

        resolve({ width, height, duration });
      });
    });
  }

  async transcodeToHLS(videoPath: string, outputBaseDir: string, streamName: string = 'qmh'): Promise<TranscodeResult> {
    const metadata = await this.getVideoMetadata(videoPath);
    console.log(`[FFmpeg] Source video metadata: ${metadata.width}x${metadata.height}, duration=${metadata.duration}s`);

    // Target resolutions: 720p, 480p, 360p
    const standardResolutions = [720, 480, 360];
    const targetResolutions = standardResolutions.filter((res) => res <= metadata.height);

    // If source height is smaller than 360, at least transcode 360p
    if (targetResolutions.length === 0) {
      targetResolutions.push(360);
    }

    console.log(`[FFmpeg] Target resolutions to transcode: ${targetResolutions.join('p, ')}p`);

    const transcodedResolutions: string[] = [];

    for (const res of targetResolutions) {
      const resDir = path.join(outputBaseDir, String(res));
      if (!fs.existsSync(resDir)) {
        fs.mkdirSync(resDir, { recursive: true });
      }

      const playlistPath = path.join(resDir, `${streamName}_${res}p.m3u8`);
      const segmentPattern = path.join(resDir, `${streamName}_${res}p_%06d.ts`);

      console.log(`[FFmpeg] Transcoding ${res}p -> ${playlistPath}`);
      await this.runHlsTranscode(videoPath, res, playlistPath, segmentPattern);
      transcodedResolutions.push(`P${res}`);
    }

    // Generate master playlist (master.m3u8)
    await this.generateMasterPlaylist(outputBaseDir, targetResolutions, streamName);

    return {
      resolutions: transcodedResolutions,
      outputDir: outputBaseDir,
      duration: metadata.duration,
    };
  }

  private runHlsTranscode(
    videoPath: string,
    height: number,
    playlistPath: string,
    segmentPattern: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .videoFilter(`scale=-2:${height}`)
        .videoCodec('libx264')
        .outputOptions([
          '-preset fast', // Fast preset for quick demo transcoding
          '-crf 23',
          '-c:a aac',
          '-b:a 128k',
          '-avoid_negative_ts make_zero',
          '-f hls',
          '-hls_time 6', // 6-second segments
          '-hls_playlist_type vod',
          '-hls_flags independent_segments',
          '-hls_list_size 0',
          `-hls_segment_filename ${segmentPattern}`,
        ])
        .output(playlistPath)
        .on('end', () => {
          console.log(`[FFmpeg] Successfully generated HLS for ${height}p`);
          resolve();
        })
        .on('error', (err) => {
          console.error(`[FFmpeg] Failed transcoding ${height}p: ${err.message}`);
          reject(err);
        })
        .run();
    });
  }

  private async generateMasterPlaylist(
    outputBaseDir: string,
    resolutions: number[],
    streamName: string
  ): Promise<void> {
    const masterPlaylistPath = path.join(outputBaseDir, 'master.m3u8');
    let content = '#EXTM3U\n#EXT-X-VERSION:3\n';

    for (const res of resolutions) {
      let bandwidth: number;
      switch (res) {
        case 720:
          bandwidth = 5000000;
          break;
        case 480:
          bandwidth = 2500000;
          break;
        case 360:
          bandwidth = 1000000;
          break;
        default:
          bandwidth = res * 5000;
      }

      const width = Math.round((res * 16) / 9);
      content += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${width}x${res},NAME="${res}p"\n`;
      content += `${res}/${streamName}_${res}p.m3u8\n`;
    }

    fs.writeFileSync(masterPlaylistPath, content, 'utf8');
    console.log(`[FFmpeg] Master playlist generated at: ${masterPlaylistPath}`);
  }
}
