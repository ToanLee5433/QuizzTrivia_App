import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import AdminProtectedRoute from './AdminProtectedRoute';

// Mock React Router Navigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Navigate: ({ to, replace }: { to: string, replace: boolean }) => {
    mockNavigate(to, replace);
    return <div data-testid="navigate">Redirecting to {to}</div>;
  }
}));

// Mock Redux store
const createMockStore = (initialState: any) => {
  return configureStore({
    reducer: {
      auth: (state = initialState.auth) => state
    }
  });
};

// Test wrapper component
const TestWrapper = ({ children, initialState }: any) => {
  const store = createMockStore(initialState);
  return (
    <Provider store={store}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </Provider>
  );
};

// Test component to render inside protected route
const TestComponent = () => <div data-testid="protected-content">Protected Admin Content</div>;

describe('AdminProtectedRoute Component', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders children when user is authenticated admin', () => {
    const adminUser = {
      uid: 'admin-123',
      email: 'admin@test.com',
      role: 'admin',
      displayName: 'Admin User'
    };

    const initialState = {
      auth: {
        user: adminUser,
        isAuthenticated: true
      }
    };

    render(
      <TestWrapper initialState={initialState}>
        <AdminProtectedRoute>
          <TestComponent />
        </AdminProtectedRoute>
      </TestWrapper>
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
  });

  it('redirects to login when user is not authenticated', () => {
    const initialState = {
      auth: {
        user: null,
        isAuthenticated: false
      }
    };

    render(
      <TestWrapper initialState={initialState}>
        <AdminProtectedRoute>
          <TestComponent />
        </AdminProtectedRoute>
      </TestWrapper>
    );

    expect(screen.getByTestId('navigate')).toBeInTheDocument();
    expect(screen.getByText('Redirecting to /login')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('redirects to login when user is null', () => {
    const initialState = {
      auth: {
        user: null,
        isAuthenticated: false
      }
    };

    render(
      <TestWrapper initialState={initialState}>
        <AdminProtectedRoute>
          <TestComponent />
        </AdminProtectedRoute>
      </TestWrapper>
    );

    expect(mockNavigate).toHaveBeenCalledWith('/login', true);
  });

  it('shows access denied when user is not admin', () => {
    const regularUser = {
      uid: 'user-123',
      email: 'user@test.com',
      role: 'user',
      displayName: 'Regular User'
    };

    const initialState = {
      auth: {
        user: regularUser,
        isAuthenticated: true
      }
    };

    render(
      <TestWrapper initialState={initialState}>
        <AdminProtectedRoute>
          <TestComponent />
        </AdminProtectedRoute>
      </TestWrapper>
    );

    expect(screen.getByText('Truy cập bị từ chối')).toBeInTheDocument();
    expect(screen.getByText(/Bạn không có quyền truy cập vào khu vực admin/)).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('shows access denied when user is creator', () => {
    const creatorUser = {
      uid: 'creator-123',
      email: 'creator@test.com',
      role: 'creator',
      displayName: 'Creator User'
    };

    const initialState = {
      auth: {
        user: creatorUser,
        isAuthenticated: true
      }
    };

    render(
      <TestWrapper initialState={initialState}>
        <AdminProtectedRoute>
          <TestComponent />
        </AdminProtectedRoute>
      </TestWrapper>
    );

    expect(screen.getByText('Truy cập bị từ chối')).toBeInTheDocument();
    expect(screen.getByText(/Chỉ quản trị viên mới có thể truy cập/)).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('handles edge case when isAuthenticated is true but user is null', () => {
    const initialState = {
      auth: {
        user: null,
        isAuthenticated: true
      }
    };

    render(
      <TestWrapper initialState={initialState}>
        <AdminProtectedRoute>
          <TestComponent />
        </AdminProtectedRoute>
      </TestWrapper>
    );

    expect(screen.getByTestId('navigate')).toBeInTheDocument();
    expect(mockNavigate).toHaveBeenCalledWith('/login', true);
  });

  it('renders access denied UI with proper styling', () => {
    const regularUser = {
      uid: 'user-123',
      email: 'user@test.com',
      role: 'user',
      displayName: 'Regular User'
    };

    const initialState = {
      auth: {
        user: regularUser,
        isAuthenticated: true
      }
    };

    const { container } = render(
      <TestWrapper initialState={initialState}>
        <AdminProtectedRoute>
          <TestComponent />
        </AdminProtectedRoute>
      </TestWrapper>
    );

    // Check for specific CSS classes
    const accessDeniedContainer = container.querySelector('.min-h-screen');
    expect(accessDeniedContainer).toHaveClass('bg-gradient-to-br', 'from-red-900', 'via-red-800', 'to-red-900');

    const card = container.querySelector('.bg-white');
    expect(card).toHaveClass('rounded-2xl', 'shadow-2xl');

    // Check for warning icon
    const warningIcon = container.querySelector('svg');
    expect(warningIcon).toBeInTheDocument();
    expect(warningIcon).toHaveClass('w-8', 'h-8', 'text-red-600');
  });

  it('displays home button in access denied page', () => {
    const regularUser = {
      uid: 'user-123',
      email: 'user@test.com',
      role: 'user',
      displayName: 'Regular User'
    };

    const initialState = {
      auth: {
        user: regularUser,
        isAuthenticated: true
      }
    };

    render(
      <TestWrapper initialState={initialState}>
        <AdminProtectedRoute>
          <TestComponent />
        </AdminProtectedRoute>
      </TestWrapper>
    );

    const backButton = screen.getByText('Quay lại');
    expect(backButton).toBeInTheDocument();
    // It's actually a button, not a Link as I expected
    expect(backButton.tagName).toBe('BUTTON');
  });

  it('handles multiple children components', () => {
    const adminUser = {
      uid: 'admin-123',
      email: 'admin@test.com',
      role: 'admin',
      displayName: 'Admin User'
    };

    const initialState = {
      auth: {
        user: adminUser,
        isAuthenticated: true
      }
    };

    render(
      <TestWrapper initialState={initialState}>
        <AdminProtectedRoute>
          <div data-testid="child1">Child 1</div>
          <div data-testid="child2">Child 2</div>
        </AdminProtectedRoute>
      </TestWrapper>
    );

    expect(screen.getByTestId('child1')).toBeInTheDocument();
    expect(screen.getByTestId('child2')).toBeInTheDocument();
  });
});
