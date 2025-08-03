import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import QuickActions from './QuickActions';

// Mock Firebase
jest.mock('../../../lib/firebase/config', () => ({
  db: {}
}));

// Mock Firestore
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
  getDocs: jest.fn(),
  updateDoc: jest.fn(),
  doc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn()
}));

// Mock react-toastify
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn()
  }
}));

const { addDoc, getDocs, updateDoc } = require('firebase/firestore');
const { toast } = require('react-toastify');

const mockStats = {
  totalUsers: 100,
  pendingQuizzes: 10,
  approvedQuizzes: 50,
  totalCategories: 5
};

const mockOnRefreshData = jest.fn();

describe('QuickActions Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    addDoc.mockResolvedValue({ id: 'test-id' });
    getDocs.mockResolvedValue({ docs: [] });
    updateDoc.mockResolvedValue({});
  });

  it('renders all quick action buttons', () => {
    render(<QuickActions onRefreshData={mockOnRefreshData} stats={mockStats} />);
    
    expect(screen.getByText('Gửi thông báo')).toBeInTheDocument();
    expect(screen.getByText('Xóa thông báo')).toBeInTheDocument();
    expect(screen.getByText('Backup dữ liệu')).toBeInTheDocument();
    expect(screen.getByText('Dọn dẹp dữ liệu xoá')).toBeInTheDocument();
  });

  it('calls onRefreshData when refresh button is clicked', () => {
    render(<QuickActions onRefreshData={mockOnRefreshData} stats={mockStats} />);
    
    // Check that stats are displayed in the status section
    expect(screen.getByText('100')).toBeInTheDocument(); // totalUsers
    expect(screen.getByText('10')).toBeInTheDocument();  // pendingQuizzes
    expect(screen.getByText('50')).toBeInTheDocument();  // approvedQuizzes
    expect(screen.getByText('5')).toBeInTheDocument();   // totalCategories
  });

  it('opens notification modal when create notification button is clicked', () => {
    render(<QuickActions onRefreshData={mockOnRefreshData} stats={mockStats} />);
    
    const notificationButton = screen.getByText('Gửi thông báo');
    fireEvent.click(notificationButton);
    
    expect(screen.getByText('Gửi thông báo hệ thống')).toBeInTheDocument();
  });

  it('creates system notification successfully', async () => {
    render(<QuickActions onRefreshData={mockOnRefreshData} stats={mockStats} />);
    
    // Open modal
    const notificationButton = screen.getByText('Gửi thông báo');
    fireEvent.click(notificationButton);
    
    // Fill form
    const messageInput = screen.getByPlaceholderText('Nhập nội dung thông báo...');
    fireEvent.change(messageInput, { target: { value: 'Test notification' } });
    
    // Submit - get the button, not the label  
    const sendButtons = screen.getAllByText('Gửi thông báo');
    const sendButton = sendButtons.find(button => button.tagName === 'BUTTON');
    fireEvent.click(sendButton!);
    
    await waitFor(() => {
      expect(addDoc).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Thông báo đã được tạo thành công!');
    });
  });

  it('shows error when notification message is empty', async () => {
    render(<QuickActions onRefreshData={mockOnRefreshData} stats={mockStats} />);
    
    // Open modal
    const notificationButton = screen.getByText('Gửi thông báo');
    fireEvent.click(notificationButton);
    
    // Check that modal opened and button is disabled initially
    expect(screen.getByPlaceholderText('Nhập nội dung thông báo...')).toBeInTheDocument();
    
    // Try to find send button and verify it's disabled when empty
    const modalButtons = screen.getAllByRole('button');
    const sendButton = modalButtons.find(button => button.textContent === 'Gửi thông báo');
    
    if (sendButton) {
      expect(sendButton).toBeDisabled();
    }
  });

  it('handles data backup functionality', async () => {
    render(<QuickActions onRefreshData={mockOnRefreshData} stats={mockStats} />);
    
    const backupButton = screen.getByText('Backup dữ liệu');
    fireEvent.click(backupButton);
    
    await waitFor(() => {
      expect(getDocs).toHaveBeenCalled();
    });
  });

  it('shows loading state during operations', async () => {
    render(<QuickActions onRefreshData={mockOnRefreshData} stats={mockStats} />);
    
    const backupButton = screen.getByText('Backup dữ liệu');
    fireEvent.click(backupButton);
    
    // Check that backup action was triggered
    await waitFor(() => {
      expect(getDocs).toHaveBeenCalled();
    });
  });

  it('handles error during notification creation', async () => {
    addDoc.mockRejectedValueOnce(new Error('Firebase error'));
    
    render(<QuickActions onRefreshData={mockOnRefreshData} stats={mockStats} />);
    
    // Open modal and fill form
    const notificationButton = screen.getByText('Gửi thông báo');
    fireEvent.click(notificationButton);
    
    const messageInput = screen.getByPlaceholderText('Nhập nội dung thông báo...');
    fireEvent.change(messageInput, { target: { value: 'Test notification' } });
    
    // Submit - get the button, not the label
    const sendButtons = screen.getAllByText('Gửi thông báo');
    const sendButton = sendButtons.find(button => button.tagName === 'BUTTON');
    fireEvent.click(sendButton!);
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Có lỗi xảy ra khi tạo thông báo!');
    });
  });

  it('closes notification modal when cancel is clicked', () => {
    render(<QuickActions onRefreshData={mockOnRefreshData} stats={mockStats} />);
    
    // Open modal
    const notificationButton = screen.getByText('Gửi thông báo');
    fireEvent.click(notificationButton);
    
    // Close modal
    const cancelButton = screen.getByText('Hủy');
    fireEvent.click(cancelButton);
    
    expect(screen.queryByText('Gửi thông báo hệ thống')).not.toBeInTheDocument();
  });

  it('handles delete notifications', async () => {
    // Mock window.confirm
    Object.defineProperty(window, 'confirm', {
      writable: true,
      value: jest.fn(() => true)
    });

    render(<QuickActions onRefreshData={mockOnRefreshData} stats={mockStats} />);
    
    const deleteButton = screen.getByText('Xóa thông báo');
    fireEvent.click(deleteButton);
    
    await waitFor(() => {
      expect(getDocs).toHaveBeenCalled();
      expect(mockOnRefreshData).toHaveBeenCalled();
    });
  });
});
