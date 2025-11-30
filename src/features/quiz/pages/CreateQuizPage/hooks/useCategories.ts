import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../../../lib/firebase/config';

export interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

/**
 * Hook để load categories từ Firestore
 * Đảm bảo categories đồng bộ giữa Create Quiz và CategoryManagement
 */
export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const categoriesRef = collection(db, 'categories');
        const snapshot = await getDocs(categoriesRef);
        
        const loadedCategories: Category[] = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          loadedCategories.push({
            id: doc.id,
            name: data.name,
            description: data.description || '',
            icon: data.icon || '📚',
            color: data.color || 'blue'
          });
        });

        // Sort alphabetically by name
        loadedCategories.sort((a, b) => a.name.localeCompare(b.name));
        
        console.log('📂 Loaded categories from Firestore:', loadedCategories.length);
        setCategories(loadedCategories);
      } catch (err) {
        console.error('❌ Error loading categories:', err);
        setError('Failed to load categories');
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, []);

  return { categories, loading, error };
};

export default useCategories;
