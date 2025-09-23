# Dalai Microservice

This microservice is a worker process that listens to a BullMQ message queue for jobs to process PDF files. On receiving a job, it downloads a PDF file from an S3-compatible storage, transcribes it using the Ollama API, and uploads the results back to an S3 bucket.

## How it Works

The worker process, implemented in `worker.js`, connects to a Redis server to listen for jobs on a BullMQ queue. When a job is received, it performs the following steps:

1.  **Download:** The PDF file specified in the job payload (`s3Bucket` and `s3Key`) is downloaded from the S3-compatible storage into a temporary local directory.
2.  **Convert to PNG:** The downloaded PDF is converted into a series of PNG images, one for each page.
3.  **Transcribe:** Each PNG image is sent to the Ollama API's `/generate` endpoint for transcription.
4.  **Save Transcriptions:** The transcribed text from each page is saved to a separate `.md` file in a local output directory.
5.  **Upload:** All the generated files (PNG images and text transcriptions) are uploaded to the specified output S3 bucket (`outputBucket` from the job payload). The file structure within the output directory is preserved in the S3 bucket.
6.  **Cleanup:** The temporary local directory containing the downloaded PDF and the generated output is removed.

The worker reports the completion of the job, including the number of uploaded files, or any errors that occurred during the process.

## Configuration

The microservice is configured using the following environment variables:

| Variable                | Description                                                                 | Default                  |
| ----------------------- | --------------------------------------------------------------------------- | ------------------------ |
| `LLAMA_SCAN_QUEUE`      | The name of the BullMQ queue to listen for jobs.                            | `llama-scan-queue`       |
| `REDIS_HOST`            | The hostname of the Redis server.                                           |                          |
| `REDIS_PORT`            | The port of the Redis server.                                               |                          |
| `CA`                    | The CA certificate for Redis connection (optional).                         |                          |
| `CERT`                  | The client certificate for Redis connection (optional).                     |                          |
| `KEY`                   | The client key for Redis connection (optional).                             |                          |
| `S3_HOST`               | The endpoint URL of the S3-compatible storage.                              |                          |
| `S3_ACCESS_KEY`         | The access key for the S3-compatible storage.                               |                          |
| `S3_SECRET_ACCESS_KEY`  | The secret access key for the S3-compatible storage.                        |                          |
| `OLLAMA_URL`            | The URL for the Ollama API's `/generate` endpoint.                          |                          |

## Running the Service

To run the service in development mode, use the following command:

```bash
npm run dev
```

This will start the worker using `nodemon`, which will automatically restart the process when file changes are detected.

## Dependencies

This service relies on the following main dependencies:

-   **`bullmq`**: For message queuing **keep this at 4.18.3** for both gptwrapper and dalai.
-   **`@aws-sdk/client-s3`**: For interacting with S3-compatible storage.
-   **`ioredis`**: As the Redis client for BullMQ.
-   **`pdf-to-png-converter`**: For converting PDF files to PNG images.
-   **`uuid`**: For generating unique IDs.
