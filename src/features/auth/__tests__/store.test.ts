import authReducer, {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  authCheckComplete,
  setRole,
  setLoading,
} from '../store';
import { AuthState, AuthUser } from '../types';

describe('Auth Reducer', () => {
  const initialState: AuthState = {
    user: null,
    isLoading: true,
    error: null,
    isAuthenticated: false,
    needsRoleSelection: false,
    authChecked: false,
  };

  const mockUser: AuthUser = {
    uid: 'test-uid',
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: 'https://example.com/avatar.jpg',
    role: 'user',
    emailVerified: true,
  };

  it('should return the initial state', () => {
    expect(authReducer(undefined, { type: undefined })).toEqual(initialState);
  });

  describe('loginStart', () => {
    it('should set loading to true and clear error', () => {
      const previousState: AuthState = {
        ...initialState,
        isLoading: false,
        error: 'Previous error',
      };

      const result = authReducer(previousState, loginStart());

      expect(result).toEqual({
        ...previousState,
        isLoading: true,
        error: null,
      });
    });
  });

  describe('loginSuccess', () => {
    it('should set user, authentication state, and clear loading/error', () => {
      const previousState: AuthState = {
        ...initialState,
        isLoading: true,
        error: 'Some error',
      };

      const result = authReducer(previousState, loginSuccess(mockUser));

      expect(result).toEqual({
        ...previousState,
        isLoading: false,
        user: mockUser,
        isAuthenticated: true,
        error: null,
        needsRoleSelection: false, // User has role
      });
    });

    it('should set needsRoleSelection to true if user has no role', () => {
      const userWithoutRole: AuthUser = {
        ...mockUser,
        role: undefined,
      };

      const result = authReducer(initialState, loginSuccess(userWithoutRole));

      expect(result.needsRoleSelection).toBe(true);
      expect(result.user).toEqual(userWithoutRole);
    });
  });

  describe('loginFailure', () => {
    it('should set error, clear user data, and stop loading', () => {
      const previousState: AuthState = {
        ...initialState,
        isLoading: true,
        user: mockUser,
        isAuthenticated: true,
      };

      const errorMessage = 'Login failed';
      const result = authReducer(previousState, loginFailure(errorMessage));

      expect(result).toEqual({
        ...previousState,
        isLoading: false,
        error: errorMessage,
        user: null,
        isAuthenticated: false,
      });
    });
  });

  describe('logout', () => {
    it('should clear user data and authentication state', () => {
      const previousState: AuthState = {
        ...initialState,
        user: mockUser,
        isAuthenticated: true,
        isLoading: true,
        error: 'Some error',
      };

      const result = authReducer(previousState, logout());

      expect(result).toEqual({
        ...previousState,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        // Note: error and other states remain unchanged by logout
        error: 'Some error',
      });
    });
  });

  describe('authCheckComplete', () => {
    it('should set loading to false and authChecked to true', () => {
      const previousState: AuthState = {
        ...initialState,
        isLoading: true,
        authChecked: false,
      };

      const result = authReducer(previousState, authCheckComplete());

      expect(result).toEqual({
        ...previousState,
        isLoading: false,
        authChecked: true,
      });
    });
  });

  describe('setRole', () => {
    it('should set role for authenticated user and clear needsRoleSelection', () => {
      const previousState: AuthState = {
        ...initialState,
        user: { ...mockUser, role: undefined },
        needsRoleSelection: true,
      };

      const result = authReducer(previousState, setRole('creator'));

      expect(result).toEqual({
        ...previousState,
        user: { ...mockUser, role: 'creator' },
        needsRoleSelection: false,
      });
    });

    it('should not crash if user is null', () => {
      const previousState: AuthState = {
        ...initialState,
        user: null,
        needsRoleSelection: true,
      };

      const result = authReducer(previousState, setRole('user'));

      expect(result).toEqual(previousState);
    });
  });

  describe('setLoading', () => {
    it('should update loading state', () => {
      const previousState: AuthState = {
        ...initialState,
        isLoading: false,
      };

      const result = authReducer(previousState, setLoading(true));

      expect(result).toEqual({
        ...previousState,
        isLoading: true,
      });
    });
  });

  describe('Edge cases and state consistency', () => {
    it('should maintain state immutability', () => {
      const state = { ...initialState };
      const originalState = JSON.parse(JSON.stringify(state));

      authReducer(state, loginStart());

      // Original state should remain unchanged
      expect(state).toEqual(originalState);
    });

    it('should handle multiple rapid state changes correctly', () => {
      let state = initialState;

      state = authReducer(state, loginStart());
      expect(state.isLoading).toBe(true);

      state = authReducer(state, loginSuccess(mockUser));
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(mockUser);

      state = authReducer(state, logout());
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBe(null);
    });

    it('should preserve other state properties when updating specific fields', () => {
      const customState: AuthState = {
        ...initialState,
        error: 'Existing error',
        authChecked: true,
      };

      const result = authReducer(customState, setLoading(false));

      expect(result.error).toBe('Existing error');
      expect(result.authChecked).toBe(true);
      expect(result.isLoading).toBe(false);
    });
  });
});
