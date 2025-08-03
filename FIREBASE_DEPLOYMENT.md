# Firebase Deployment Guide

## Chuẩn bị môi trường

### 1. Cài đặt Firebase CLI
```bash
npm install -g firebase-tools
```

### 2. Đăng nhập Firebase
```bash
firebase login
```

### 3. Khởi tạo project (đã có sẵn)
```bash
firebase init
```

## Deploy Hosting

### 1. Build ứng dụng
```bash
npm run build
```

### 2. Deploy hosting
```bash
firebase deploy --only hosting
```

### 3. Deploy full (hosting + functions)
```bash
npm run firebase:deploy:full
```

## Deploy Functions

### 1. Di chuyển vào thư mục functions
```bash
cd functions
```

### 2. Cài đặt dependencies
```bash
npm install
```

### 3. Deploy functions
```bash
cd ..
firebase deploy --only functions
```

## Cấu hình Vertex AI

### 1. Enable APIs cần thiết
- Vertex AI API
- Cloud Functions API
- Firebase Hosting API

### 2. Cấu hình IAM roles
- Cloud Functions Service Agent
- Vertex AI Service Agent

### 3. Cấu hình billing account
- Vertex AI yêu cầu billing account được enable

## URLs sau khi deploy

### Hosting URL
```
https://quiz-app-85db6.web.app
```

### Function URLs
```
https://us-central1-quiz-app-85db6.cloudfunctions.net/generateQuestions
https://us-central1-quiz-app-85db6.cloudfunctions.net/testAI
```

## Testing

### 1. Test hosting
```bash
firebase serve --only hosting
```

### 2. Test functions locally
```bash
cd functions
npm run serve
```

### 3. Test full app
```bash
firebase emulators:start
```

## Troubleshooting

### Common Issues

#### 1. Build errors
- Check TypeScript compilation
- Verify all dependencies installed
- Check for unused imports

#### 2. Function deployment errors
- Verify Node.js version (18)
- Check IAM permissions
- Verify billing account

#### 3. Vertex AI errors
- Check API enablement
- Verify project permissions
- Check quota limits

### Logs
```bash
# View hosting logs
firebase hosting:logs

# View function logs
firebase functions:log

# View real-time logs
firebase functions:log --follow
```

## Performance Tips

### 1. Optimize build size
- Use code splitting
- Lazy load components
- Optimize images

### 2. Cache strategies
- Configure proper cache headers
- Use service workers
- Implement offline functionality

### 3. Function optimization
- Set appropriate memory limits
- Use connection pooling
- Implement caching

## Security

### 1. Firebase Security Rules
- Configure Firestore rules
- Set proper authentication
- Limit function access

### 2. Environment Variables
- Use Firebase config for secrets
- Don't commit API keys
- Use different configs for dev/prod

## Monitoring

### 1. Firebase Performance
- Monitor Core Web Vitals
- Track user sessions
- Monitor crash reports

### 2. Function Performance
- Monitor execution time
- Track error rates
- Set up alerts

## Custom Domain (Optional)

### 1. Add custom domain
```bash
firebase hosting:sites:create your-domain
```

### 2. Configure DNS
- Add A records
- Configure SSL

### 3. Verify domain
```bash
firebase hosting:sites:list
```
