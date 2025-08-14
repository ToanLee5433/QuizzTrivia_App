# Configuration Files

This directory contains all configuration files for the project.

## Structure

### `/env`
Environment configuration files:
- `.env.development` - Development environment variables
- `.env.production` - Production environment variables
- `.env.example` - Example environment file

### `/firebase`
Firebase and Firestore configuration:
- `firebase.json` - Firebase hosting/functions config
- `.firebaserc` - Firebase project settings
- `firestore.rules` - Firestore security rules
- `firestore.indexes.json` - Firestore indexes

### `/typescript`
TypeScript configuration:
- `tsconfig.json` - Main TypeScript config
- `tsconfig.node.json` - Node.js TypeScript config

### Root Level
- `eslintrc.cjs` - ESLint configuration for code linting
- `jest.config.cjs` - Jest configuration for testing
- `postcss.config.js` - PostCSS configuration for CSS processing
- `tailwind.config.js` - Tailwind CSS configuration
- `vite.config.ts` - Vite build tool configuration

## Usage

Configuration files are automatically synced to root level when needed using:
```bash
npm run sync-config
```

This ensures tools can find their config files while keeping the project organized.
