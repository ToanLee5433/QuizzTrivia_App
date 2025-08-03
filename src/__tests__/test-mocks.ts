// Test utilities for Firebase mocking

// Simple test to make Jest recognize this as a valid test file
describe('Firebase Mocks', () => {
  it('should create firebase mocks correctly', () => {
    const mocks = createFirebaseMocks();
    expect(mocks.collection).toBeDefined();
    expect(mocks.doc).toBeDefined();
    expect(mocks.addDoc).toBeDefined();
    expect(mocks.getDocs).toBeDefined();
    expect(mocks.updateDoc).toBeDefined();
    expect(mocks.deleteDoc).toBeDefined();
  });
});

export const createFirebaseMocks = () => {
  const mockCollection = jest.fn();
  const mockDoc = jest.fn();
  const mockAddDoc = jest.fn();
  const mockGetDocs = jest.fn();
  const mockUpdateDoc = jest.fn();
  const mockDeleteDoc = jest.fn();
  const mockQuery = jest.fn();
  const mockWhere = jest.fn();
  const mockOrderBy = jest.fn();
  const mockLimit = jest.fn();

  // Default implementations
  mockAddDoc.mockResolvedValue({ id: 'mock-doc-id' });
  mockGetDocs.mockResolvedValue({ 
    docs: [],
    size: 0,
    empty: true
  });
  mockUpdateDoc.mockResolvedValue({});
  mockDeleteDoc.mockResolvedValue({});
  mockCollection.mockReturnValue({ id: 'mock-collection' });
  mockDoc.mockReturnValue({ id: 'mock-doc' });
  mockQuery.mockReturnValue({ id: 'mock-query' });
  mockWhere.mockReturnValue({ id: 'mock-where' });
  mockOrderBy.mockReturnValue({ id: 'mock-orderby' });
  mockLimit.mockReturnValue({ id: 'mock-limit' });

  return {
    collection: mockCollection,
    doc: mockDoc,
    addDoc: mockAddDoc,
    getDocs: mockGetDocs,
    updateDoc: mockUpdateDoc,
    deleteDoc: mockDeleteDoc,
    query: mockQuery,
    where: mockWhere,
    orderBy: mockOrderBy,
    limit: mockLimit,
    Timestamp: {
      now: jest.fn(() => ({ seconds: Math.floor(Date.now() / 1000) })),
      fromDate: jest.fn((date) => ({ seconds: Math.floor(date.getTime() / 1000) }))
    }
  };
};

export const createMockFirebaseAuth = () => {
  return {
    signOut: jest.fn().mockResolvedValue({}),
    signInWithEmailAndPassword: jest.fn().mockResolvedValue({
      user: { uid: 'test-uid', email: 'test@example.com' }
    }),
    createUserWithEmailAndPassword: jest.fn().mockResolvedValue({
      user: { uid: 'test-uid', email: 'test@example.com' }
    }),
    onAuthStateChanged: jest.fn()
  };
};

export const createMockToast = () => {
  return {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn()
  };
};

// Helper to setup common mocks
// Global mocks - using proper jest mock patterns
const mockFirebaseAuth = {
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn(),
  currentUser: null
};

const mockFirestore = {
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  addDoc: jest.fn()
};

const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warning: jest.fn()
};

// Mock setup function
export const setupTestMocks = () => {
  // Mock Firebase config
  jest.mock('../../../lib/firebase/config', () => ({
    db: mockFirestore,
    auth: mockFirebaseAuth
  }));

  // Mock Firestore
  jest.mock('firebase/firestore', () => ({
    getFirestore: () => mockFirestore,
    collection: mockFirestore.collection,
    doc: mockFirestore.doc,
    getDoc: mockFirestore.getDoc,
    setDoc: mockFirestore.setDoc,
    updateDoc: mockFirestore.updateDoc,
    deleteDoc: mockFirestore.deleteDoc,
    addDoc: mockFirestore.addDoc
  }));

  // Mock Firebase Auth
  jest.mock('firebase/auth', () => ({
    getAuth: () => mockFirebaseAuth,
    signInWithEmailAndPassword: mockFirebaseAuth.signInWithEmailAndPassword,
    createUserWithEmailAndPassword: mockFirebaseAuth.createUserWithEmailAndPassword,
    signOut: mockFirebaseAuth.signOut,
    onAuthStateChanged: mockFirebaseAuth.onAuthStateChanged
  }));

  // Mock react-toastify
  jest.mock('react-toastify', () => ({
    toast: mockToast
  }));

  return {
    firebase: mockFirestore,
    auth: mockFirebaseAuth,
    toast: mockToast
  };
};
