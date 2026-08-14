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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import lombok.extern.slf4j.Slf4j;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

@Slf4j
@Service
public class S3StorageService {

    @Value("${azure.storage.account-name:}")
    private String accountName;

    @Value("${azure.storage.container-name:vod-container}")
    private String containerName;

    @Value("${azure.storage.connection-string:}")
    private String connectionString;

    @Value("${azure.storage.public-url:}")
    private String publicBaseUrl;

    private BlobContainerClient containerClient;

    @PostConstruct
    public void init() {
        try {
            BlobServiceClient blobServiceClient;

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
            } else {
                // Fallback / mock endpoint for local Azurite emulator
                String endpoint = "http://127.0.0.1:10000/devstoreaccount1";
                blobServiceClient = new BlobServiceClientBuilder()
                        .endpoint(endpoint)
                        .buildClient();
            }

            this.containerClient = blobServiceClient.getBlobContainerClient(containerName);
            if (!containerClient.exists()) {
                containerClient.create();
            }
        } catch (Exception e) {
            log.warn("Storage client init warning (container '{}'): {}", containerName, e.getMessage());
        }
    }

    /**
     * Upload a MultipartFile to Azure Blob Storage
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

        String blobName = (folder != null && !folder.isEmpty()) ? folder + "/" + fileName : fileName;
        BlobClient blobClient = containerClient.getBlobClient(blobName);

        BlobHttpHeaders headers = new BlobHttpHeaders().setContentType(file.getContentType());
        blobClient.upload(file.getInputStream(), file.getSize(), true);
        blobClient.setHttpHeaders(headers);

        return getPublicUrl(blobName);
    }

    /**
     * Upload a file from local path to Azure Blob Storage
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

        String blobName = (folder != null && !folder.isEmpty()) ? folder + "/" + fileName : fileName;
        String contentType = Files.probeContentType(localFilePath);
        if (contentType == null) {
            contentType = "application/octet-stream";
        }

        BlobClient blobClient = containerClient.getBlobClient(blobName);
        blobClient.uploadFromFile(localFilePath.toString(), true);
        blobClient.setHttpHeaders(new BlobHttpHeaders().setContentType(contentType));

        return getPublicUrl(blobName);
    }

    /**
     * Upload raw bytes to Azure Blob Storage
     */
    public void uploadBytes(byte[] data, String key, String contentType) {
        BlobClient blobClient = containerClient.getBlobClient(key);
        ByteArrayInputStream dataStream = new ByteArrayInputStream(data);
        blobClient.upload(dataStream, data.length, true);
        blobClient.setHttpHeaders(new BlobHttpHeaders().setContentType(contentType != null ? contentType : "application/octet-stream"));
    }

    /**
     * Upload an InputStream to Azure Blob Storage
     */
    public void uploadStream(InputStream inputStream, String key, String contentType, long contentLength) {
        BlobClient blobClient = containerClient.getBlobClient(key);
        blobClient.upload(inputStream, contentLength, true);
        blobClient.setHttpHeaders(new BlobHttpHeaders().setContentType(contentType != null ? contentType : "application/octet-stream"));
    }

    /**
     * Delete a single blob from Azure Blob Storage
     */
    public void deleteFile(String key) {
        BlobClient blobClient = containerClient.getBlobClient(key);
        if (blobClient.exists()) {
            blobClient.delete();
        }
    }

    /**
     * Delete all blobs with a given prefix (folder delete)
     */
    public void deleteFolder(String prefix) {
        ListBlobsOptions options = new ListBlobsOptions().setPrefix(prefix);
        for (BlobItem blobItem : containerClient.listBlobs(options, null)) {
            containerClient.getBlobClient(blobItem.getName()).delete();
        }
    }

    /**
     * Download a file from Azure Blob Storage to a local path
     */
    public void downloadFile(String key, Path localPath) throws IOException {
        Files.createDirectories(localPath.getParent());
        BlobClient blobClient = containerClient.getBlobClient(key);
        blobClient.downloadToFile(localPath.toString(), true);
    }

    /**
     * Get public URL for a given blob key
     */
    public String getPublicUrl(String key) {
        if (publicBaseUrl != null && !publicBaseUrl.isEmpty()) {
            String base = publicBaseUrl.endsWith("/") ? publicBaseUrl : publicBaseUrl + "/";
            return base + key;
        }
        if (accountName != null && !accountName.isEmpty()) {
            return String.format("https://%s.blob.core.windows.net/%s/%s", accountName, containerName, key);
        }
        return containerClient.getBlobClient(key).getBlobUrl();
    }

    /**
     * Extract key from a full Azure Blob Storage URL
     */
    public String extractKeyFromUrl(String url) {
        if (url == null) return null;

        if (publicBaseUrl != null && !publicBaseUrl.isEmpty() && url.startsWith(publicBaseUrl)) {
            String base = publicBaseUrl.endsWith("/") ? publicBaseUrl : publicBaseUrl + "/";
            return url.substring(base.length());
        }

        String azurePrefix = String.format("https://%s.blob.core.windows.net/%s/", accountName, containerName);
        if (url.startsWith(azurePrefix)) {
            return url.substring(azurePrefix.length());
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
