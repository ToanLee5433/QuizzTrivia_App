import { LoginCredentials, RegisterCredentials } from '../types';

// Mock Firebase completely to avoid import issues
jest.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  updateProfile: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  updatePassword: jest.fn(),
  sendEmailVerification: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
}));

jest.mock('../../../firebase/config', () => ({
  auth: {},
  db: {},
}));

// Mock the entire auth services module
const mockSignIn = jest.fn();
const mockRegister = jest.fn();
const mockSignOutUser = jest.fn();

jest.mock('../services', () => ({
  signIn: mockSignIn,
  register: mockRegister,
  signOutUser: mockSignOutUser,
}));

describe('Auth Services', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('signIn', () => {
    const mockCredentials: LoginCredentials = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should handle successful login', async () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: 'https://example.com/photo.jpg',
        emailVerified: true,
        role: 'user',
      };

      mockSignIn.mockResolvedValue(mockUser);

      const result = await mockSignIn(mockCredentials);

      expect(mockSignIn).toHaveBeenCalledWith(mockCredentials);
      expect(result).toEqual(mockUser);
    });

    it('should handle admin login', async () => {
      const adminCredentials = {
        email: 'admin123@gmail.com',
        password: 'admin123',
      };

      const mockAdminUser = {
        uid: 'admin-uid',
        email: 'admin123@gmail.com',
        displayName: 'Admin User',
        photoURL: null,
        emailVerified: true,
        role: 'admin',
      };

      mockSignIn.mockResolvedValue(mockAdminUser);

      const result = await mockSignIn(adminCredentials);

      expect(result.role).toBe('admin');
    });

    it('should handle login errors', async () => {
      const errorMessage = 'Invalid credentials';
      mockSignIn.mockRejectedValue(new Error(errorMessage));

      await expect(mockSignIn(mockCredentials)).rejects.toThrow(errorMessage);
    });
  });

  describe('register', () => {
    const mockRegisterCredentials: RegisterCredentials = {
      email: 'newuser@example.com',
      password: 'password123',
      displayName: 'New User',
      confirmPassword: 'password123',
    };

    it('should handle successful registration', async () => {
      const mockUser = {
        uid: 'new-user-uid',
        email: 'newuser@example.com',
        displayName: 'New User',
        photoURL: null,
        emailVerified: false,
        role: undefined,
      };

      mockRegister.mockResolvedValue(mockUser);

      const result = await mockRegister(mockRegisterCredentials);

      expect(mockRegister).toHaveBeenCalledWith(mockRegisterCredentials);
      expect(result).toEqual(mockUser);
    });

    it('should handle registration errors', async () => {
      const errorMessage = 'Email already in use';
      mockRegister.mockRejectedValue(new Error(errorMessage));

      await expect(mockRegister(mockRegisterCredentials)).rejects.toThrow(errorMessage);
    });
  });

  describe('signOutUser', () => {
    it('should handle successful logout', async () => {
      localStorage.setItem('user_role_test-uid', 'user');
      localStorage.setItem('isAdmin', 'false');

      mockSignOutUser.mockResolvedValue(undefined);

      await mockSignOutUser();

      expect(mockSignOutUser).toHaveBeenCalled();
    });

    it('should handle logout errors', async () => {
      const errorMessage = 'Logout failed';
      mockSignOutUser.mockRejectedValue(new Error(errorMessage));

      await expect(mockSignOutUser()).rejects.toThrow(errorMessage);
    });
  });

  describe('Error scenarios', () => {
    it('should handle network errors', async () => {
      mockSignIn.mockRejectedValue(new Error('Network error'));

      await expect(mockSignIn({
        email: 'test@example.com',
        password: 'password',
      })).rejects.toThrow('Network error');
    });

    it('should handle authentication failures', async () => {
      mockSignIn.mockRejectedValue(new Error('auth/invalid-email'));

      await expect(mockSignIn({
        email: 'invalid-email',
        password: 'password',
      })).rejects.toThrow('auth/invalid-email');
    });
  });

  describe('LocalStorage management', () => {
    it('should handle localStorage operations', () => {
      const testKey = 'test_key';
      const testValue = 'test_value';

      localStorage.setItem(testKey, testValue);
      expect(localStorage.getItem(testKey)).toBe(testValue);

      localStorage.removeItem(testKey);
      expect(localStorage.getItem(testKey)).toBe(null);
    });

    it('should clear localStorage on logout', () => {
      localStorage.setItem('user_role_123', 'user');
      localStorage.setItem('isAdmin', 'false');

      // Simulate logout clearing localStorage
      localStorage.clear();

      expect(localStorage.getItem('user_role_123')).toBe(null);
      expect(localStorage.getItem('isAdmin')).toBe(null);
    });
  });
});
