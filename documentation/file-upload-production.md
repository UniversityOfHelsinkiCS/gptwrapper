# File Upload Configuration for Production

## Overview
File uploads in CurreChat are now limited to 10MB to ensure stability and reliability. This document outlines the configuration needed for file uploads to work properly in production environments.

## Application Configuration

### File Size Limits
- **AI Chat Endpoint** (`/api/ai/v3/stream`): 10 MB limit
- **RAG Index Upload** (`/api/rag/:ragIndexId/upload`): 10 MB limit
- **Express JSON Body Parser**: 10 MB limit

These limits are now enforced at the application level with proper error handling.

## Production Environment Requirements

### Reverse Proxy/Load Balancer Configuration

If you're using a reverse proxy (like nginx, Apache, or a cloud load balancer) in front of the application, you **must** configure the following settings:

#### Nginx Configuration Example
```nginx
http {
    # Maximum allowed size for client request body
    client_max_body_size 10M;
    
    # Increase timeouts for file upload processing
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;
    proxy_read_timeout 300s;
    
    # Allow larger buffers for file uploads
    client_body_buffer_size 10M;
    
    server {
        location /api/ {
            proxy_pass http://currechat-backend:8000;
            
            # Pass through original request headers
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Disable buffering for streaming responses
            proxy_buffering off;
            proxy_cache off;
        }
    }
}
```

#### Apache Configuration Example
```apache
<VirtualHost *:80>
    # Maximum allowed size for request body (in bytes)
    LimitRequestBody 10485760
    
    # Increase timeout for long-running requests
    ProxyTimeout 300
    
    <Location /api/>
        ProxyPass http://currechat-backend:8000/api/
        ProxyPassReverse http://currechat-backend:8000/api/
    </Location>
</VirtualHost>
```

#### AWS Application Load Balancer
- Ensure target group deregistration delay is appropriate (default 300s may be too high)
- Health check grace period should account for file processing time
- Idle timeout should be set to at least 300 seconds

#### Kubernetes Ingress Example
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: currechat-ingress
  annotations:
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    nginx.ingress.kubernetes.io/proxy-connect-timeout: "300"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "300"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "300"
spec:
  rules:
  - host: currechat.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: currechat-service
            port:
              number: 8000
```

### Cloud Provider Specific Notes

#### AWS
- If using CloudFront, ensure that the distribution allows POST/PUT requests
- Check S3 bucket CORS configuration if file uploads go directly to S3

#### Azure
- Application Gateway needs proper timeout configuration
- Check App Service request size limits

#### Google Cloud Platform  
- Cloud Load Balancer timeout settings
- Cloud Run has a maximum request size - ensure it's configured appropriately

## Known Issues and Troubleshooting

### Issue: File uploads are flaky or fail intermittently

**Possible Causes:**
1. **Reverse proxy timeout too low**: File processing (especially PDF parsing) can take time
2. **Connection pooling issues**: Some proxies may drop connections during file processing
3. **Memory constraints**: Large files in memory storage can cause issues under load

**Solutions:**
1. Increase proxy timeouts to at least 300 seconds
2. Ensure proper error handling is enabled in the proxy
3. Monitor application memory usage and scale appropriately

### Issue: File uploads fail for files smaller than 10MB

**Possible Causes:**
1. Reverse proxy has a lower limit configured
2. Network interruptions during upload
3. Client-side timeout

**Solutions:**
1. Check and adjust reverse proxy configuration
2. Implement retry logic on the client side
3. Check network stability between client and server

### Issue: Files upload successfully but processing fails

**Possible Causes:**
1. S3 connectivity issues
2. Insufficient memory for PDF parsing
3. Redis/database connectivity issues

**Solutions:**
1. Verify S3 credentials and connectivity
2. Monitor application memory and increase if needed
3. Check Redis and database connection pools

## Monitoring Recommendations

Monitor the following metrics in production:

1. **File upload success rate**
   - Track successful vs. failed uploads
   - Alert on high failure rates

2. **Upload duration**
   - Track p50, p95, p99 upload times
   - Alert on unusually long upload times

3. **Memory usage**
   - Monitor application memory during file uploads
   - Alert on memory spikes or OOM events

4. **Error rates**
   - Track multer errors (LIMIT_FILE_SIZE, etc.)
   - Monitor file parsing errors

## Testing File Uploads

To test file uploads in your production environment:

1. Test with a small text file (< 1MB)
2. Test with a medium PDF (2-5 MB)
3. Test with a file at the limit (exactly 10MB)
4. Test with a file slightly over the limit (should fail with clear error)
5. Test concurrent uploads from multiple users

## Security Considerations

- File size limits help prevent DoS attacks
- File type validation is performed during processing
- All files are scanned during the ingestion pipeline
- Implement rate limiting on upload endpoints if not already present
- Consider implementing virus scanning for uploaded files

## Future Improvements

Consider these improvements for better file upload handling:

1. **Direct S3 uploads with presigned URLs**: Bypass the application server for large files
2. **Chunked uploads**: Allow resumable uploads for better reliability
3. **Background processing**: Move file processing to background jobs
4. **CDN integration**: Serve processed files via CDN
5. **Compression**: Automatically compress files before storage
