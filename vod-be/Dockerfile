# Multi-stage build for StreamForge Backend API using Gradle
FROM eclipse-temurin:21-jdk-alpine AS builder

WORKDIR /app

# Install gradle
RUN apk add --no-cache gradle

# Copy Gradle build files
COPY build.gradle settings.gradle ./

# Copy source code
COPY src ./src

# Build bootJar without tests
RUN gradle bootJar --no-daemon -x test

# Runtime stage (JRE only, lightweight)
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Create application storage directory
RUN mkdir -p /app/storage && chmod 777 /app/storage

# Copy jar from builder
COPY --from=builder /app/build/libs/streamforge-backend.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
