import '@testing-library/jest-dom';

// Add TextEncoder/TextDecoder polyfills for Node.js environment
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock crypto for Node.js environment
const crypto = require('crypto');
Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: crypto.randomUUID
  }
});

// Mock Firebase with simple objects
jest.mock('./firebase/config', () => ({
  db: {},
  auth: {
    currentUser: null
  },
  analytics: {}
}));

// Mock Firebase functions
jest.mock('firebase/firestore', () => {
  const mockQuery = jest.fn();
  const mockCollection = jest.fn(() => ({ path: 'mock-collection' }));
  const mockWhere = jest.fn(() => mockQuery);
  const mockOrderBy = jest.fn(() => mockQuery);
  const mockLimit = jest.fn(() => mockQuery);
  
  // Mock document data for testing
  const mockQuizzes = [
    {
      id: 'quiz1',
      data: () => ({
        title: 'Sample Quiz 1',
        description: 'A test quiz',
        status: 'pending',
        createdAt: { toDate: () => new Date() },
        category: 'Technology',
        difficulty: 'medium',
        questions: []
      })
    },
    {
      id: 'quiz2', 
      data: () => ({
        title: 'Sample Quiz 2',
        description: 'Another test quiz',
        status: 'approved',
        createdAt: { toDate: () => new Date() },
        category: 'Science',
        difficulty: 'hard',
        questions: []
      })
    }
  ];

  const mockGetDocs = jest.fn(() => Promise.resolve({ 
    docs: mockQuizzes,
    size: mockQuizzes.length,
    empty: false
  }));

  return {
    getFirestore: jest.fn(),
    collection: mockCollection,
    query: mockQuery,
    where: mockWhere,
    orderBy: mockOrderBy,
    limit: mockLimit,
    getDocs: mockGetDocs,
    doc: jest.fn((_db, collection, id) => ({ 
      id, 
      path: `${collection}/${id}`,
      collection: { id: collection }
    })),
    getDoc: jest.fn(() => Promise.resolve({ 
      exists: () => true,
      data: () => mockQuizzes[0].data(),
      id: 'mock-id'
    })),
    setDoc: jest.fn(() => Promise.resolve()),
    updateDoc: jest.fn(() => Promise.resolve()),
    deleteDoc: jest.fn(() => Promise.resolve()),
    addDoc: jest.fn(() => Promise.resolve({ id: 'mock-new-id' })),
    arrayUnion: jest.fn((value) => ({ type: 'arrayUnion', value })),
    arrayRemove: jest.fn((value) => ({ type: 'arrayRemove', value }))
  };
});

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn()
}));

// Mock React Router
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/' }),
  useParams: () => ({}),
  Link: 'a',
  NavLink: 'a',
  BrowserRouter: 'div',
  Routes: 'div',
  Route: 'div',
}));

// Mock React Toastify
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  },
  ToastContainer: () => null,
}));

// Global test utilities
global.console = {
  ...console,
  // Uncomment to suppress console logs during tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));
