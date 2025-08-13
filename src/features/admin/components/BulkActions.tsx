import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase/config';

import { useTranslation } from 'react-i18next';
interface BulkActionsProps {
  selectedItems: string[];
  itemType: 'users' | 'quizzes';
  onClearSelection: () => void;
  onRefresh: () => void;
}

const BulkActions: React.FC<BulkActionsProps> = ({ 
  selectedItems, 
  itemType, 
  onClearSelection, 
  onRefresh 
}) => {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(false);

  if (selectedItems.length === 0) return null;

  const bulkDelete = async () => {
    if (!confirm(`Bạn có chắc muốn xóa ${selectedItems.length} ${itemType}?`)) return;
    
    setLoading(true);
    try {
      const promises = selectedItems.map(id => 
        deleteDoc(doc(db, itemType, id))
      );
      await Promise.all(promises);
      
      toast.success(`Đã xóa ${selectedItems.length} ${itemType}!`);
      onClearSelection();
      onRefresh();
    } catch (error) {
      toast.error('Lỗi khi xóa hàng loạt!');
    } finally {
      setLoading(false);
    }
  };

  const bulkUpdateStatus = async (status: any) => {
    setLoading(true);
    try {
      const field = itemType === 'users' ? 'isActive' : 'status';
      const promises = selectedItems.map(id => 
        updateDoc(doc(db, itemType, id), { [field]: status })
      );
      await Promise.all(promises);
      
      toast.success(`Đã cập nhật ${selectedItems.length} ${itemType}!`);
      onClearSelection();
      onRefresh();
    } catch (error) {
      toast.error('Lỗi khi cập nhật hàng loạt!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between">
        <span className="text-blue-800 font-medium">
          Đã chọn {selectedItems.length} {itemType}
        </span>
        
        <div className="flex gap-2">
          {itemType === 'users' && (
            <>
              <button
                onClick={() => bulkUpdateStatus(true)}
                disabled={loading}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
              >{t("action.activate")}
              </button>
              <button
                onClick={() => bulkUpdateStatus(false)}
                disabled={loading}
                className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
              >{t("action.deactivate")}
              </button>
            </>
          )}
          
          {itemType === 'quizzes' && (
            <>
              <button
                onClick={() => bulkUpdateStatus('approved')}
                disabled={loading}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
              >{t("admin.editRequests.approve")}
              </button>
              <button
                onClick={() => bulkUpdateStatus('rejected')}
                disabled={loading}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >{t("admin.editRequests.reject")}
              </button>
            </>
          )}
          
          <button
            onClick={bulkDelete}
            disabled={loading}
            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >{t("action.clear")}
          </button>
          
          <button
            onClick={onClearSelection}
            className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
          >{t("common.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkActions;
