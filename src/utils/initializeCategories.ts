import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase/config';

const defaultCategories = [
  {
    name: 'Programming',
    description: 'Lập trình và phát triển phần mềm',
    icon: '💻',
    color: 'blue'
  },
  {
    name: 'Web Development',
    description: 'Phát triển web frontend và backend',
    icon: '🌐',
    color: 'green'
  },
  {
    name: 'Science',
    description: 'Khoa học tự nhiên và công nghệ',
    icon: '🔬',
    color: 'purple'
  },
  {
    name: 'Mathematics',
    description: 'Toán học và thống kê',
    icon: '🧮',
    color: 'indigo'
  },
  {
    name: 'General Knowledge',
    description: 'Kiến thức tổng hợp',
    icon: '📚',
    color: 'gray'
  },
  {
    name: 'History',
    description: 'Lịch sử thế giới và Việt Nam',
    icon: '📜',
    color: 'yellow'
  },
  {
    name: 'Sports',
    description: 'Thể thao và sức khỏe',
    icon: '🏃‍♂️',
    color: 'red'
  },
  {
    name: 'Entertainment',
    description: 'Giải trí và văn hóa',
    icon: '🎭',
    color: 'pink'
  }
];

export const initializeCategories = async () => {
  try {
    console.log('🔍 Checking if categories exist...');
    const categoriesRef = collection(db, 'categories');
    const snapshot = await getDocs(categoriesRef);
    
    if (snapshot.empty) {
      console.log('📝 No categories found, creating default categories...');
      
      for (const category of defaultCategories) {
        await addDoc(categoriesRef, {
          ...category,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log(`✅ Created category: ${category.name}`);
      }
      
      console.log('🎉 Default categories initialized successfully!');
      return true;
    } else {
      console.log(`📊 Found ${snapshot.size} existing categories`);
      return false;
    }
  } catch (error) {
    console.error('❌ Error initializing categories:', error);
    throw error;
  }
};
