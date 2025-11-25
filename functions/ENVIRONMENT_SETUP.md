# 🔐 Environment Variables Setup

## Required Environment Variables

### Local Development

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Google AI API key:
```env
GOOGLE_AI_API_KEY=your_google_ai_api_key_here
```3. The `.env` file is already in `.gitignore` and will NOT be committed to Git.

### Firebase Functions (Production)

For production deployment, set environment variables using Firebase CLI:

```bash
# Set Google AI API key
firebase functions:config:set google.api_key="your_google_ai_api_key_here"

# Verify configuration
firebase functions:config:get

# Deploy functions with new config
firebase deploy --only functions
```

### Alternative: Firebase Secret Manager (Recommended)

For better security in production, use Firebase Secret Manager:

```bash
# Create secret
firebase functions:secrets:set GOOGLE_AI_API_KEY

# Grant access to functions
firebase functions:secrets:access GOOGLE_AI_API_KEY

# Update function to use secret
# In your function definition:
# .runWith({ secrets: ['GOOGLE_AI_API_KEY'] })
```

## Security Best Practices

✅ **DO**:
- Use environment variables for all API keys
- Keep `.env` file in `.gitignore`
- Use Firebase Secret Manager for production
- Rotate keys regularly

❌ **DON'T**:
- Hardcode API keys in source code
- Commit `.env` file to Git
- Share API keys in documentation
- Use same keys for dev and production

## Troubleshooting

### Local Development
If you get "API key not found" error:
1. Check `.env` file exists in `functions/` folder
2. Restart your development server
3. Verify key format (no quotes, no spaces)

### Production Deployment
If functions fail with auth errors:
1. Verify config: `firebase functions:config:get`
2. Check IAM permissions in Firebase Console
3. Redeploy: `firebase deploy --only functions`
