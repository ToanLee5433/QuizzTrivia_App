import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ASSETS = {
  // 🟢 A. SOUND EFFECTS (15 files) - Sử dụng Freesound.org & Mixkit
  sounds: {
    // Nhóm tương tác cơ bản
    'click.mp3': 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
    'join.mp3': 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3',
    'ready.mp3': 'https://assets.mixkit.co/active_storage/sfx/2570/2570-preview.mp3',
    'kick.mp3': 'https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3',

    // Nhóm Gameplay (Quan trọng)
    'start.mp3': 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3',
    'game-start.mp3': 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
    'countdown.mp3': 'https://assets.mixkit.co/active_storage/sfx/381/381-preview.mp3',
    'tick.mp3': 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
    'timeup.mp3': 'https://assets.mixkit.co/active_storage/sfx/777/777-preview.mp3',
    'transition.mp3': 'https://assets.mixkit.co/active_storage/sfx/2573/2573-preview.mp3',
    
    // Nhóm Kết quả & Hiệu ứng
    'correct.mp3': 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3',
    'wrong.mp3': 'https://assets.mixkit.co/active_storage/sfx/2955/2955-preview.mp3',
    'powerup.mp3': 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
    'victory.mp3': 'https://assets.mixkit.co/active_storage/sfx/1465/1465-preview.mp3',
    'applause.mp3': 'https://assets.mixkit.co/active_storage/sfx/273/273-preview.mp3',
  },

  // 🔵 B. BACKGROUND MUSIC (9 files - Loopable)
  music: {
    // Nhạc sảnh & Chờ
    'lobby-music.mp3': 'https://assets.mixkit.co/active_storage/sfx/2817/2817-preview.mp3',
    'waiting-music.mp3': 'https://assets.mixkit.co/active_storage/sfx/2815/2815-preview.mp3',
    
    // Nhạc Gameplay (Theo mood)
    'game-bgm.mp3': 'https://assets.mixkit.co/active_storage/sfx/2789/2789-preview.mp3',
    'chill.mp3': 'https://assets.mixkit.co/active_storage/sfx/2816/2816-preview.mp3',
    'energetic.mp3': 'https://assets.mixkit.co/active_storage/sfx/2790/2790-preview.mp3',
    'intense.mp3': 'https://assets.mixkit.co/active_storage/sfx/2788/2788-preview.mp3',
    
    // Nhạc nền nhẹ & Chiến thắng
    'ambient-1.mp3': 'https://assets.mixkit.co/active_storage/sfx/2818/2818-preview.mp3',
    'ambient-2.mp3': 'https://assets.mixkit.co/active_storage/sfx/4113/4113-preview.mp3',
    'victory-music.mp3': 'https://assets.mixkit.co/active_storage/sfx/1465/1465-preview.mp3',
  },

  // 🟧 C. MEME GIFS (4 files)
  memes: {
    'success-meme.gif': 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif',
    'fail-meme.gif': 'https://media.giphy.com/media/d2lcHJTG5Tscg/giphy.gif',
    'thinking-meme.gif': 'https://media.giphy.com/media/3o7btPCcdNniyf0ArS/giphy.gif',
    'winner-meme.gif': 'https://media.giphy.com/media/g9582DNuQppxC/giphy.gif',
  },

  // 🟩 D. IMAGES (1 file)
  images: {
    'default-quiz-cover.png': 'https://images.unsplash.com/photo-1516534775068-ba3e7458af70?w=1200&h=630&fit=crop',
  }
};

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);
    
    const request = client.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 302 || response.statusCode === 301) {
        file.close();
        fs.unlink(dest, () => {});
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      
      if (response.statusCode !== 200) {
        file.close();
        fs.unlink(dest, () => {});
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve();
      });
      
      file.on('error', (err) => {
        file.close();
        fs.unlink(dest, () => {});
        reject(err);
      });
    });
    
    request.on('error', (err) => {
      file.close();
      fs.unlink(dest, () => {});
      reject(err);
    });
    
    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error('Timeout'));
    });
  });
}

async function main() {
  console.log('🚀 Starting asset download...\n');
  
  // Create directories
  const dirs = {
    sounds: path.join(__dirname, '..', 'public', 'sounds'),
    music: path.join(__dirname, '..', 'public', 'sounds', 'music'),
    memes: path.join(__dirname, '..', 'public', 'images', 'memes'),
    images: path.join(__dirname, '..', 'public', 'images'),
  };

  Object.entries(dirs).forEach(([name, dir]) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created directory: ${name}`);
    }
  });

  console.log('');

  // Download all files
  let success = 0;
  let failed = 0;
  const failedFiles = [];

  for (const [category, files] of Object.entries(ASSETS)) {
    console.log(`📥 Downloading ${category}...`);
    
    for (const [filename, url] of Object.entries(files)) {
      const destPath = path.join(dirs[category], filename);
      
      // Skip if already exists
      if (fs.existsSync(destPath)) {
        const size = (fs.statSync(destPath).size / 1024).toFixed(2);
        console.log(`  ⏭️  ${filename} (already exists, ${size} KB)`);
        success++;
        continue;
      }
      
      try {
        console.log(`  ⏳ ${filename}...`);
        await downloadFile(url, destPath);
        const size = (fs.statSync(destPath).size / 1024).toFixed(2);
        console.log(`  ✅ ${filename} (${size} KB)`);
        success++;
      } catch (err) {
        console.error(`  ❌ ${filename}: ${err.message}`);
        failed++;
        failedFiles.push({ filename, url, error: err.message });
      }
    }
    console.log('');
  }

  console.log('═'.repeat(60));
  console.log(`✨ Download complete!`);
  console.log(`   Success: ${success} files`);
  console.log(`   Failed:  ${failed} files`);
  console.log('═'.repeat(60));

  if (failedFiles.length > 0) {
    console.log('\n⚠️  Failed downloads (you can retry these manually):');
    failedFiles.forEach(({ filename, url, error }) => {
      console.log(`\n   ${filename}:`);
      console.log(`   URL: ${url}`);
      console.log(`   Error: ${error}`);
    });
    
    // Save failed list to file
    fs.writeFileSync(
      path.join(__dirname, 'failed-downloads.json'),
      JSON.stringify(failedFiles, null, 2)
    );
    console.log('\n   Failed list saved to: tools/failed-downloads.json');
  }

  // Summary
  const totalExpected = Object.values(ASSETS).reduce((sum, cat) => sum + Object.keys(cat).length, 0);
  console.log(`\n📊 Total: ${success}/${totalExpected} files downloaded`);
  
  if (success === totalExpected) {
    console.log('\n🎉 All assets downloaded successfully!');
    console.log('   You can now run: npm run build');
  } else {
    console.log('\n⚠️  Some files failed. Please check the URLs or download manually.');
  }
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
