import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Các files còn thiếu (10 files)
const REMAINING_SOUNDS = {
  // Sound effects (8 files)
  'correct.mp3': 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3',
  'wrong.mp3': 'https://assets.mixkit.co/active_storage/sfx/2955/2955-preview.mp3',
  'countdown.mp3': 'https://assets.mixkit.co/active_storage/sfx/381/381-preview.mp3',
  'tick.mp3': 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
  'transition.mp3': 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
  'powerup.mp3': 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
  'start.mp3': 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3',
  'timeup.mp3': 'https://assets.mixkit.co/active_storage/sfx/777/777-preview.mp3',
  'victory.mp3': 'https://assets.mixkit.co/active_storage/sfx/1465/1465-preview.mp3',
  'applause.mp3': 'https://assets.mixkit.co/active_storage/sfx/273/273-preview.mp3',
};

const soundsDir = path.join(__dirname, '..', 'public', 'sounds');

// Đảm bảo thư mục tồn tại
if (!fs.existsSync(soundsDir)) {
  fs.mkdirSync(soundsDir, { recursive: true });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);
    
    const request = protocol.get(url, { timeout: 30000 }, (response) => {
      // Follow redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        fs.unlinkSync(dest);
        return downloadFile(response.headers.location, dest)
          .then(resolve)
          .catch(reject);
      }
      
      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        return reject(new Error(`HTTP ${response.statusCode}`));
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        const size = (fs.statSync(dest).size / 1024).toFixed(2);
        resolve(size);
      });
    });
    
    request.on('error', (err) => {
      file.close();
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(err);
    });
    
    request.on('timeout', () => {
      request.destroy();
      file.close();
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(new Error('Request timeout'));
    });
  });
}

async function main() {
  console.log('🚀 Downloading remaining sound files...\n');
  console.log('═'.repeat(60));
  
  let success = 0;
  let skipped = 0;
  let failed = 0;
  const failedFiles = {};
  
  for (const [filename, url] of Object.entries(REMAINING_SOUNDS)) {
    const destPath = path.join(soundsDir, filename);
    
    // Skip if file already exists
    if (fs.existsSync(destPath)) {
      const size = (fs.statSync(destPath).size / 1024).toFixed(2);
      console.log(`⏭️  ${filename} (already exists, ${size} KB)`);
      skipped++;
      continue;
    }
    
    try {
      console.log(`⏳ ${filename}...`);
      const size = await downloadFile(url, destPath);
      console.log(`✅ ${filename} (${size} KB)`);
      success++;
    } catch (error) {
      console.error(`❌ ${filename}: ${error.message}`);
      failedFiles[filename] = { url, error: error.message };
      failed++;
    }
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log(`✨ Download complete!`);
  console.log(`   Success: ${success} files`);
  console.log(`   Skipped: ${skipped} files`);
  console.log(`   Failed:  ${failed} files`);
  console.log('═'.repeat(60));
  
  if (failed > 0) {
    console.log('\n⚠️  Failed downloads:');
    for (const [filename, info] of Object.entries(failedFiles)) {
      console.log(`\n   ${filename}:`);
      console.log(`   URL: ${info.url}`);
      console.log(`   Error: ${info.error}`);
    }
    
    // Save failed list
    const failedListPath = path.join(__dirname, 'failed-sounds.json');
    fs.writeFileSync(failedListPath, JSON.stringify(failedFiles, null, 2));
    console.log('\n   Failed list saved to: tools/failed-sounds.json');
  }
  
  const totalExpected = Object.keys(REMAINING_SOUNDS).length;
  const totalDownloaded = success + skipped;
  
  console.log(`\n📊 Total: ${totalDownloaded}/${totalExpected} files available`);
  
  if (totalDownloaded === totalExpected) {
    console.log('\n🎉 All sound files are ready!');
    console.log('   You can now run: npm run build');
  } else {
    console.log('\n⚠️  Some files are missing. Please check URLs or download manually.');
  }
}

main().catch(console.error);
