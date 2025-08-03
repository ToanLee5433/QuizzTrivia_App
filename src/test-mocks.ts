// Test utilities for Firebase mocking
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
export const setupTestMocks = () => {
  const firebaseMocks = createFirebaseMocks();
  const authMocks = createMockFirebaseAuth();
  const toastMocks = createMockToast();

  // Mock Firebase config
  jest.mock('../../../lib/firebase/config', () => ({
    db: {},
    auth: authMocks
  }));

  // Mock Firestore
  jest.mock('firebase/firestore', () => firebaseMocks);

  // Mock Firebase Auth
  jest.mock('firebase/auth', () => authMocks);

  // Mock react-toastify
  jest.mock('react-toastify', () => ({
    toast: toastMocks
  }));

  return {
    firebase: firebaseMocks,
    auth: authMocks,
    toast: toastMocks
  };
};
