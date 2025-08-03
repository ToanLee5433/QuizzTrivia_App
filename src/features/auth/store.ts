import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AuthUser, AuthState } from './types';

const initialState: AuthState = {
  user: null,
  isLoading: true, // Bắt đầu với loading = true để chờ Firebase auth check
  error: null,
  isAuthenticated: false,
  needsRoleSelection: false,
  authChecked: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    loginSuccess: (state, action: PayloadAction<AuthUser>) => {
      console.log('🎯 Auth loginSuccess reducer called with:', action.payload);
      state.isLoading = false;
      state.user = action.payload;
      state.isAuthenticated = true;
      state.error = null;
      // Kiểm tra xem user đã chọn role chưa (ưu tiên needsRoleSelection từ payload)
      state.needsRoleSelection = action.payload.needsRoleSelection ?? !action.payload.role;
      console.log('🎯 Auth state after loginSuccess:', {
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        needsRoleSelection: state.needsRoleSelection,
        isLoading: state.isLoading
      });
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
      state.user = null;
      state.isAuthenticated = false;
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.isLoading = false;
    },
    authCheckComplete: (state) => {
      state.isLoading = false;
      state.authChecked = true;
    },
    setRole: (state, action: PayloadAction<'user' | 'creator'>) => {
      if (state.user) {
        state.user.role = action.payload;
        // Không cần chọn role nữa
        state.needsRoleSelection = false;
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});

export const {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  authCheckComplete,
  setRole,
  setLoading,
} = authSlice.actions;

export default authSlice.reducer;
