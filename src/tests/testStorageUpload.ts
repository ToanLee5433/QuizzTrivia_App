/**
 * Test Firebase Storage Upload
 * Chạy script này để test upload PDF/Video/Audio
 */

import { storage } from '../lib/firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

async function testStorageUpload() {
  console.log('🧪 Testing Firebase Storage Upload...\n');

  try {
    // Test 1: Create a test text file
    console.log('📝 Test 1: Creating test file...');
    const testContent = 'This is a test file for Firebase Storage';
    const testBlob = new Blob([testContent], { type: 'text/plain' });
    const testFile = new File([testBlob], 'test.txt', { type: 'text/plain' });

    // Test 2: Upload to Storage
    console.log('⬆️ Test 2: Uploading to learning-resources/pdfs/test/...');
    const timestamp = Date.now();
    const storagePath = `learning-resources/pdfs/test_${timestamp}/test.txt`;
    const storageRef = ref(storage, storagePath);

    const metadata = {
      contentType: 'text/plain',
      customMetadata: {
        uploadedBy: 'test-script',
        uploadedAt: new Date().toISOString()
      }
    };

    await uploadBytes(storageRef, testFile, metadata);
    console.log('✅ Upload successful!');

    // Test 3: Get download URL
    console.log('🔗 Test 3: Getting download URL...');
    const downloadURL = await getDownloadURL(storageRef);
    console.log('✅ Download URL:', downloadURL);

    console.log('\n✅ ALL TESTS PASSED!');
    console.log('\n📊 Summary:');
    console.log('  ✓ Firebase Storage initialized');
    console.log('  ✓ File upload working');
    console.log('  ✓ Download URL generation working');
    console.log('  ✓ Storage Rules allowing uploads');
    
    return true;
  } catch (error: any) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('\n🔍 Error details:', error);
    
    if (error.code === 'storage/unauthorized') {
      console.error('\n⚠️ PERMISSION DENIED - Storage Rules chưa deploy hoặc chưa đúng!');
      console.error('   Giải pháp:');
      console.error('   1. Chạy: firebase deploy --only storage');
      console.error('   2. Hoặc deploy qua Firebase Console');
      console.error('   3. Đợi 30s cho rules có hiệu lực');
    }
    
    return false;
  }
}

// Run test if this file is executed directly
if (typeof window !== 'undefined') {
  console.log('⚠️ Chạy test này trong browser console:');
  console.log('import("./src/tests/testStorageUpload").then(m => m.default())');
}

export default testStorageUpload;
