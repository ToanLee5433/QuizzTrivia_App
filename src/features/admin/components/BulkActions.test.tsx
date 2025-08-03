import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import BulkActions from './BulkActions';

// Mock Firebase
jest.mock('../../../lib/firebase/config', () => ({
  db: {}
}));

// Mock Firestore
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn()
}));

// Mock react-toastify
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}));

// Mock window.confirm
Object.defineProperty(window, 'confirm', {
  writable: true,
  value: jest.fn()
});

const { updateDoc, deleteDoc } = require('firebase/firestore');
const { toast } = require('react-toastify');

const mockOnClearSelection = jest.fn();
const mockOnRefresh = jest.fn();

describe('BulkActions Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    updateDoc.mockResolvedValue({});
    deleteDoc.mockResolvedValue({});
    (window.confirm as jest.Mock).mockReturnValue(true);
  });

  it('does not render when no items are selected', () => {
    const { container } = render(
      <BulkActions
        selectedItems={[]}
        itemType="users"
        onClearSelection={mockOnClearSelection}
        onRefresh={mockOnRefresh}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders bulk actions when items are selected', () => {
    render(
      <BulkActions
        selectedItems={['item1', 'item2']}
        itemType="users"
        onClearSelection={mockOnClearSelection}
        onRefresh={mockOnRefresh}
      />
    );

    expect(screen.getByText('Đã chọn 2 users')).toBeInTheDocument();
    expect(screen.getByText('Xóa')).toBeInTheDocument();
    expect(screen.getByText('Hủy')).toBeInTheDocument();
  });

  it('shows correct count for selected items', () => {
    render(
      <BulkActions
        selectedItems={['item1', 'item2', 'item3', 'item4', 'item5']}
        itemType="quizzes"
        onClearSelection={mockOnClearSelection}
        onRefresh={mockOnRefresh}
      />
    );

    expect(screen.getByText('Đã chọn 5 quizzes')).toBeInTheDocument();
  });

  it('calls onClearSelection when clear button is clicked', () => {
    render(
      <BulkActions
        selectedItems={['item1', 'item2']}
        itemType="users"
        onClearSelection={mockOnClearSelection}
        onRefresh={mockOnRefresh}
      />
    );

    const clearButton = screen.getByText('Hủy');
    fireEvent.click(clearButton);

    expect(mockOnClearSelection).toHaveBeenCalledTimes(1);
  });

  it('performs bulk delete when confirmed', async () => {
    render(
      <BulkActions
        selectedItems={['item1', 'item2']}
        itemType="users"
        onClearSelection={mockOnClearSelection}
        onRefresh={mockOnRefresh}
      />
    );

    const deleteButton = screen.getByText('Xóa');
    fireEvent.click(deleteButton);

    expect(window.confirm).toHaveBeenCalledWith('Bạn có chắc muốn xóa 2 users?');

    await waitFor(() => {
      expect(deleteDoc).toHaveBeenCalledTimes(2);
      expect(toast.success).toHaveBeenCalledWith('Đã xóa 2 users!');
      expect(mockOnClearSelection).toHaveBeenCalled();
      expect(mockOnRefresh).toHaveBeenCalled();
    });
  });

  it('cancels delete when not confirmed', () => {
    (window.confirm as jest.Mock).mockReturnValue(false);

    render(
      <BulkActions
        selectedItems={['item1', 'item2']}
        itemType="quizzes"
        onClearSelection={mockOnClearSelection}
        onRefresh={mockOnRefresh}
      />
    );

    const deleteButton = screen.getByText('Xóa');
    fireEvent.click(deleteButton);

    expect(window.confirm).toHaveBeenCalledWith('Bạn có chắc muốn xóa 2 quizzes?');
    expect(deleteDoc).not.toHaveBeenCalled();
  });

  it('handles bulk approval for quizzes', async () => {
    render(
      <BulkActions
        selectedItems={['quiz1', 'quiz2']}
        itemType="quizzes"
        onClearSelection={mockOnClearSelection}
        onRefresh={mockOnRefresh}
      />
    );

    const approveButton = screen.getByText('Duyệt');
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(updateDoc).toHaveBeenCalledTimes(2);
      expect(toast.success).toHaveBeenCalledWith('Đã cập nhật 2 quizzes!');
      expect(mockOnClearSelection).toHaveBeenCalled();
      expect(mockOnRefresh).toHaveBeenCalled();
    });
  });

  it('handles bulk rejection for quizzes', async () => {
    render(
      <BulkActions
        selectedItems={['quiz1', 'quiz2']}
        itemType="quizzes"
        onClearSelection={mockOnClearSelection}
        onRefresh={mockOnRefresh}
      />
    );

    const rejectButton = screen.getByText('Từ chối');
    fireEvent.click(rejectButton);

    await waitFor(() => {
      expect(updateDoc).toHaveBeenCalledTimes(2);
      expect(toast.success).toHaveBeenCalledWith('Đã cập nhật 2 quizzes!');
      expect(mockOnClearSelection).toHaveBeenCalled();
      expect(mockOnRefresh).toHaveBeenCalled();
    });
  });

  it('shows different actions for users vs quizzes', () => {
    const { rerender } = render(
      <BulkActions
        selectedItems={['item1', 'item2']}
        itemType="users"
        onClearSelection={mockOnClearSelection}
        onRefresh={mockOnRefresh}
      />
    );

    // Users should have activate/deactivate and delete actions
    expect(screen.getByText('Kích hoạt')).toBeInTheDocument();
    expect(screen.getByText('Vô hiệu hóa')).toBeInTheDocument();
    expect(screen.getByText('Xóa')).toBeInTheDocument();
    expect(screen.getByText('Hủy')).toBeInTheDocument();
    expect(screen.queryByText('Duyệt')).not.toBeInTheDocument();

    rerender(
      <BulkActions
        selectedItems={['item1', 'item2']}
        itemType="quizzes"
        onClearSelection={mockOnClearSelection}
        onRefresh={mockOnRefresh}
      />
    );

    // Quizzes should have approve/reject actions
    expect(screen.getByText('Duyệt')).toBeInTheDocument();
    expect(screen.getByText('Từ chối')).toBeInTheDocument();
    expect(screen.getByText('Xóa')).toBeInTheDocument();
  });

  it('disables buttons during loading', async () => {
    render(
      <BulkActions
        selectedItems={['item1', 'item2']}
        itemType="users"
        onClearSelection={mockOnClearSelection}
        onRefresh={mockOnRefresh}
      />
    );

    const deleteButton = screen.getByText('Xóa');
    fireEvent.click(deleteButton);

    // Buttons should be disabled during operation
    expect(deleteButton).toBeDisabled();
  });

  it('handles errors during bulk operations', async () => {
    deleteDoc.mockRejectedValueOnce(new Error('Firebase error'));

    render(
      <BulkActions
        selectedItems={['item1']}
        itemType="users"
        onClearSelection={mockOnClearSelection}
        onRefresh={mockOnRefresh}
      />
    );

    const deleteButton = screen.getByText('Xóa');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Lỗi khi xóa hàng loạt!');
    });
  });

  it('handles user activation/deactivation', async () => {
    render(
      <BulkActions
        selectedItems={['user1', 'user2']}
        itemType="users"
        onClearSelection={mockOnClearSelection}
        onRefresh={mockOnRefresh}
      />
    );

    const activateButton = screen.getByText('Kích hoạt');
    fireEvent.click(activateButton);

    await waitFor(() => {
      expect(updateDoc).toHaveBeenCalledTimes(2);
      expect(toast.success).toHaveBeenCalledWith('Đã cập nhật 2 users!');
    });
  });
});
