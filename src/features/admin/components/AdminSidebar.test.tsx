import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import AdminSidebar from './AdminSidebar';

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

describe('AdminSidebar Component', () => {
  const adminUser = {
    uid: 'admin-123',
    email: 'admin@test.com',
    role: 'admin',
    displayName: 'Admin User'
  };

  const regularUser = {
    uid: 'user-123',
    email: 'user@test.com',
    role: 'user',
    displayName: 'Regular User'
  };

  it('renders admin navigation when user is admin', () => {
    const initialState = {
      auth: { user: adminUser, isAuthenticated: true }
    };

    render(
      <TestWrapper initialState={initialState}>
        <AdminSidebar />
      </TestWrapper>
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Quản lý Quiz')).toBeInTheDocument();
    expect(screen.getByText('Quản lý User')).toBeInTheDocument();
    expect(screen.getByText('Phân quyền')).toBeInTheDocument();
  });

  it('does not render when user is not admin', () => {
    const initialState = {
      auth: { user: regularUser, isAuthenticated: true }
    };

    render(
      <TestWrapper initialState={initialState}>
        <AdminSidebar />
      </TestWrapper>
    );

    // AdminSidebar should not render admin content for non-admin users
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });

  it('does not render when user is null', () => {
    const initialState = {
      auth: { user: null, isAuthenticated: false }
    };

    render(
      <TestWrapper initialState={initialState}>
        <AdminSidebar />
      </TestWrapper>
    );

    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });

  it('contains correct navigation links', () => {
    const initialState = {
      auth: { user: adminUser, isAuthenticated: true }
    };

    render(
      <TestWrapper initialState={initialState}>
        <AdminSidebar />
      </TestWrapper>
    );

    const dashboardLink = screen.getByText('Dashboard').closest('a');
    const quizLink = screen.getByText('Quản lý Quiz').closest('a');
    const userLink = screen.getByText('Quản lý User').closest('a');
    const rolesLink = screen.getByText('Phân quyền').closest('a');

    expect(dashboardLink).toHaveAttribute('to', '/admin');
    expect(quizLink).toHaveAttribute('to', '/admin/quiz-management');
    expect(userLink).toHaveAttribute('to', '/admin/users');
    expect(rolesLink).toHaveAttribute('to', '/admin/roles');
  });

  it('displays navigation icons', () => {
    const initialState = {
      auth: { user: adminUser, isAuthenticated: true }
    };

    render(
      <TestWrapper initialState={initialState}>
        <AdminSidebar />
      </TestWrapper>
    );

    // Check for emoji icons (use getAllByText to handle duplicates)
    const homeIcons = screen.getAllByText('🏠');
    expect(homeIcons).toHaveLength(2); // Dashboard and Quick Actions
    expect(screen.getByText('📝')).toBeInTheDocument(); // Quiz Management
    expect(screen.getByText('👥')).toBeInTheDocument(); // User Management
    expect(screen.getByText('🔐')).toBeInTheDocument(); // Roles
  });

  it('renders with proper responsive classes', () => {
    const initialState = {
      auth: { user: adminUser, isAuthenticated: true }
    };

    const { container } = render(
      <TestWrapper initialState={initialState}>
        <AdminSidebar />
      </TestWrapper>
    );

    // Get the actual sidebar div
    const sidebar = container.querySelector('[class*="w-64"]');
    expect(sidebar).toHaveClass('w-64'); // Desktop width
    expect(sidebar).toHaveClass('bg-gray-900'); // Background color
    expect(sidebar).toHaveClass('fixed'); // Fixed position
  });

  it('handles different user roles correctly', () => {
    const creatorUser = {
      uid: 'creator-123',
      email: 'creator@test.com',
      role: 'creator',
      displayName: 'Creator User'
    };

    const initialState = {
      auth: { user: creatorUser, isAuthenticated: true }
    };

    render(
      <TestWrapper initialState={initialState}>
        <AdminSidebar />
      </TestWrapper>
    );

    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });
});
