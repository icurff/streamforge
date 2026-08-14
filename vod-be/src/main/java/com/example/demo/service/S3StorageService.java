package com.example.demo.service;

import com.azure.core.credential.TokenCredential;
import com.azure.identity.DefaultAzureCredentialBuilder;
import com.azure.storage.blob.BlobClient;
import com.azure.storage.blob.BlobContainerClient;
import com.azure.storage.blob.BlobServiceClient;
import com.azure.storage.blob.BlobServiceClientBuilder;
import com.azure.storage.blob.models.BlobHttpHeaders;
import com.azure.storage.blob.models.BlobItem;
import com.azure.storage.blob.models.ListBlobsOptions;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class S3StorageService {

    @Value("${aws.s3.bucket-name:streamforge-media-dev-393698973321}")
    private String s3BucketName;

    @Value("${aws.region:ap-southeast-1}")
    private String awsRegion;

    @Value("${aws.s3.media-public-url:}")
    private String mediaPublicUrl;

    @Value("${azure.storage.account-name:}")
    private String accountName;

    @Value("${azure.storage.container-name:vod-container}")
    private String containerName;

    @Value("${azure.storage.connection-string:}")
    private String connectionString;

    @Value("${azure.storage.public-url:}")
    private String publicBaseUrl;

    private S3Presigner s3Presigner;
    private S3Client s3Client;
    private BlobContainerClient containerClient;

    @PostConstruct
    public void init() {
        // Initialize AWS S3 Presigner & Client
        try {
            this.s3Presigner = S3Presigner.builder()
                    .region(Region.of(awsRegion))
                    .credentialsProvider(DefaultCredentialsProvider.create())
                    .build();

            this.s3Client = S3Client.builder()
                    .region(Region.of(awsRegion))
                    .credentialsProvider(DefaultCredentialsProvider.create())
                    .build();

            log.info("Initialized AWS S3 Presigner & S3Client for region: {}, bucket: {}", awsRegion, s3BucketName);
        } catch (Exception e) {
            log.warn("AWS S3 client init warning: {}", e.getMessage());
        }

        // Initialize Azure Blob Client if configured
        try {
            BlobServiceClient blobServiceClient = null;
            if (connectionString != null && !connectionString.isBlank()) {
                blobServiceClient = new BlobServiceClientBuilder()
                        .connectionString(connectionString)
                        .buildClient();
            } else if (accountName != null && !accountName.isBlank()) {
                String endpoint = String.format("https://%s.blob.core.windows.net", accountName);
                TokenCredential credential = new DefaultAzureCredentialBuilder().build();
                blobServiceClient = new BlobServiceClientBuilder()
                        .endpoint(endpoint)
                        .credential(credential)
                        .buildClient();
            }

            if (blobServiceClient != null) {
                this.containerClient = blobServiceClient.getBlobContainerClient(containerName);
                if (!containerClient.exists()) {
                    containerClient.create();
                }
                log.info("Initialized Azure Blob Container: {}", containerName);
            }
        } catch (Exception e) {
            log.warn("Azure Blob storage client init warning: {}", e.getMessage());
        }
    }

    @PreDestroy
    public void cleanup() {
        if (s3Presigner != null) {
            try {
                s3Presigner.close();
            } catch (Exception ignored) {}
        }
        if (s3Client != null) {
            try {
                s3Client.close();
            } catch (Exception ignored) {}
        }
    }

    /**
     * Generate AWS S3 Presigned PUT URL for direct client-side upload
     */
    public String generatePresignedUploadUrl(String key, String contentType, Duration expiration) {
        if (s3Presigner != null && s3BucketName != null && !s3BucketName.isBlank()) {
            try {
                PutObjectRequest objectRequest = PutObjectRequest.builder()
                        .bucket(s3BucketName)
                        .key(key)
                        .contentType(contentType != null && !contentType.isBlank() ? contentType : "video/mp4")
                        .build();

                PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                        .signatureDuration(expiration != null ? expiration : Duration.ofMinutes(30))
                        .putObjectRequest(objectRequest)
                        .build();

                PresignedPutObjectRequest presignedPutObjectRequest = s3Presigner.presignPutObject(presignRequest);
                String url = presignedPutObjectRequest.url().toString();
                log.info("Generated presigned upload URL for key: {}", key);
                return url;
            } catch (Exception e) {
                log.error("Failed to generate presigned upload URL: {}", e.getMessage(), e);
                throw new RuntimeException("Failed to generate upload URL", e);
            }
        }

        throw new IllegalStateException("S3 Presigner is not initialized or bucket name is missing");
    }

    public String getS3BucketName() {
        return s3BucketName;
    }

    /**
     * Upload a MultipartFile to S3 / Blob Storage
     */
    public String uploadFile(MultipartFile file, String folder, String fileName) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File cannot be null or empty");
        }

        String extension = getFileExtension(file.getOriginalFilename());
        if (fileName == null || fileName.isEmpty()) {
            fileName = UUID.randomUUID().toString() + extension;
        } else if (!fileName.contains(".")) {
            fileName = fileName + extension;
        }

        String key = (folder != null && !folder.isEmpty()) ? folder + "/" + fileName : fileName;

        // Try AWS S3 first
        if (s3Client != null && s3BucketName != null && !s3BucketName.isBlank()) {
            try {
                PutObjectRequest putReq = PutObjectRequest.builder()
                        .bucket(s3BucketName)
                        .key(key)
                        .contentType(file.getContentType())
                        .build();
                s3Client.putObject(putReq, software.amazon.awssdk.core.sync.RequestBody.fromInputStream(file.getInputStream(), file.getSize()));
                return getPublicUrl(key);
            } catch (Exception e) {
                log.warn("S3 direct upload failed, fallback to Azure if available: {}", e.getMessage());
            }
        }

        // Fallback to Azure Blob
        if (containerClient != null) {
            BlobClient blobClient = containerClient.getBlobClient(key);
            BlobHttpHeaders headers = new BlobHttpHeaders().setContentType(file.getContentType());
            blobClient.upload(file.getInputStream(), file.getSize(), true);
            blobClient.setHttpHeaders(headers);
            return getPublicUrl(key);
        }

        return getPublicUrl(key);
    }

    /**
     * Upload a file from local path to Cloud Storage
     */
    public String uploadFileFromPath(Path localFilePath, String folder, String fileName) throws IOException {
        if (!Files.exists(localFilePath)) {
            throw new IllegalArgumentException("File does not exist: " + localFilePath);
        }

        String originalFilename = localFilePath.getFileName().toString();
        String extension = getFileExtension(originalFilename);

        if (fileName == null || fileName.isEmpty()) {
            fileName = UUID.randomUUID().toString() + extension;
        } else if (!fileName.contains(".")) {
            fileName = fileName + extension;
        }

        String key = (folder != null && !folder.isEmpty()) ? folder + "/" + fileName : fileName;
        String contentType = Files.probeContentType(localFilePath);
        if (contentType == null) {
            contentType = "application/octet-stream";
        }

        if (s3Client != null && s3BucketName != null && !s3BucketName.isBlank()) {
            try {
                PutObjectRequest putReq = PutObjectRequest.builder()
                        .bucket(s3BucketName)
                        .key(key)
                        .contentType(contentType)
                        .build();
                s3Client.putObject(putReq, localFilePath);
                return getPublicUrl(key);
            } catch (Exception e) {
                log.warn("S3 uploadFromFile failed, fallback to Azure if available: {}", e.getMessage());
            }
        }

        if (containerClient != null) {
            BlobClient blobClient = containerClient.getBlobClient(key);
            blobClient.uploadFromFile(localFilePath.toString(), true);
            blobClient.setHttpHeaders(new BlobHttpHeaders().setContentType(contentType));
            return getPublicUrl(key);
        }

        return getPublicUrl(key);
    }

    /**
     * Upload raw bytes to Cloud Storage
     */
    public void uploadBytes(byte[] data, String key, String contentType) {
        if (s3Client != null && s3BucketName != null && !s3BucketName.isBlank()) {
            try {
                PutObjectRequest putReq = PutObjectRequest.builder()
                        .bucket(s3BucketName)
                        .key(key)
                        .contentType(contentType != null ? contentType : "application/octet-stream")
                        .build();
                s3Client.putObject(putReq, software.amazon.awssdk.core.sync.RequestBody.fromBytes(data));
                return;
            } catch (Exception e) {
                log.warn("S3 uploadBytes failed: {}", e.getMessage());
            }
        }

        if (containerClient != null) {
            BlobClient blobClient = containerClient.getBlobClient(key);
            ByteArrayInputStream dataStream = new ByteArrayInputStream(data);
            blobClient.upload(dataStream, data.length, true);
            blobClient.setHttpHeaders(new BlobHttpHeaders().setContentType(contentType != null ? contentType : "application/octet-stream"));
        }
    }

    /**
     * Upload an InputStream to Cloud Storage
     */
    public void uploadStream(InputStream inputStream, String key, String contentType, long contentLength) {
        if (s3Client != null && s3BucketName != null && !s3BucketName.isBlank()) {
            try {
                PutObjectRequest putReq = PutObjectRequest.builder()
                        .bucket(s3BucketName)
                        .key(key)
                        .contentType(contentType != null ? contentType : "application/octet-stream")
                        .build();
                s3Client.putObject(putReq, software.amazon.awssdk.core.sync.RequestBody.fromInputStream(inputStream, contentLength));
                return;
            } catch (Exception e) {
                log.warn("S3 uploadStream failed: {}", e.getMessage());
            }
        }

        if (containerClient != null) {
            BlobClient blobClient = containerClient.getBlobClient(key);
            blobClient.upload(inputStream, contentLength, true);
            blobClient.setHttpHeaders(new BlobHttpHeaders().setContentType(contentType != null ? contentType : "application/octet-stream"));
        }
    }

    /**
     * Delete a single file from Cloud Storage
     */
    public void deleteFile(String key) {
        if (s3Client != null && s3BucketName != null && !s3BucketName.isBlank()) {
            try {
                s3Client.deleteObject(DeleteObjectRequest.builder().bucket(s3BucketName).key(key).build());
            } catch (Exception e) {
                log.warn("S3 deleteFile failed: {}", e.getMessage());
            }
        }

        if (containerClient != null) {
            try {
                BlobClient blobClient = containerClient.getBlobClient(key);
                if (blobClient.exists()) {
                    blobClient.delete();
                }
            } catch (Exception e) {
                log.warn("Azure deleteFile failed: {}", e.getMessage());
            }
        }
    }

    /**
     * Delete all blobs/objects with a given prefix (folder delete)
     */
    public void deleteFolder(String prefix) {
        if (containerClient != null) {
            try {
                ListBlobsOptions options = new ListBlobsOptions().setPrefix(prefix);
                for (BlobItem blobItem : containerClient.listBlobs(options, null)) {
                    containerClient.getBlobClient(blobItem.getName()).delete();
                }
            } catch (Exception e) {
                log.warn("Azure deleteFolder warning: {}", e.getMessage());
            }
        }
    }

    /**
     * Download a file from Cloud Storage to a local path
     */
    public void downloadFile(String key, Path localPath) throws IOException {
        Files.createDirectories(localPath.getParent());
        if (s3Client != null && s3BucketName != null && !s3BucketName.isBlank()) {
            try {
                s3Client.getObject(r -> r.bucket(s3BucketName).key(key), localPath);
                return;
            } catch (Exception e) {
                log.warn("S3 downloadFile failed: {}", e.getMessage());
            }
        }

        if (containerClient != null) {
            BlobClient blobClient = containerClient.getBlobClient(key);
            blobClient.downloadToFile(localPath.toString(), true);
        }
    }

    /**
     * Get public URL for a given key
     */
    public String getPublicUrl(String key) {
        if (mediaPublicUrl != null && !mediaPublicUrl.isEmpty()) {
            String base = mediaPublicUrl.endsWith("/") ? mediaPublicUrl : mediaPublicUrl + "/";
            return base + key;
        }
        if (publicBaseUrl != null && !publicBaseUrl.isEmpty()) {
            String base = publicBaseUrl.endsWith("/") ? publicBaseUrl : publicBaseUrl + "/";
            return base + key;
        }
        if (accountName != null && !accountName.isEmpty()) {
            return String.format("https://%s.blob.core.windows.net/%s/%s", accountName, containerName, key);
        }
        if (s3BucketName != null && !s3BucketName.isEmpty()) {
            return String.format("https://%s.s3.%s.amazonaws.com/%s", s3BucketName, awsRegion, key);
        }
        return key;
    }

    /**
     * Extract key from a full URL
     */
    public String extractKeyFromUrl(String url) {
        if (url == null) return null;

        if (mediaPublicUrl != null && !mediaPublicUrl.isEmpty() && url.startsWith(mediaPublicUrl)) {
            String base = mediaPublicUrl.endsWith("/") ? mediaPublicUrl : mediaPublicUrl + "/";
            return url.substring(base.length());
        }

        if (publicBaseUrl != null && !publicBaseUrl.isEmpty() && url.startsWith(publicBaseUrl)) {
            String base = publicBaseUrl.endsWith("/") ? publicBaseUrl : publicBaseUrl + "/";
            return url.substring(base.length());
        }

        String azurePrefix = String.format("https://%s.blob.core.windows.net/%s/", accountName, containerName);
        if (url.startsWith(azurePrefix)) {
            return url.substring(azurePrefix.length());
        }

        String s3Prefix = String.format("https://%s.s3.%s.amazonaws.com/", s3BucketName, awsRegion);
        if (url.startsWith(s3Prefix)) {
            return url.substring(s3Prefix.length());
        }

        return null;
    }

    private String getFileExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            return ".jpg";
        }
        return filename.substring(filename.lastIndexOf("."));
    }
}
