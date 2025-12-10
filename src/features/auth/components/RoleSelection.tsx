import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { setRole } from '../../auth/store';
import { AuthUser } from '../../auth/types';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase/config';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

interface RoleSelectionProps {
  user: AuthUser;
  onRoleSelected: (role: 'user' | 'creator') => void;
}

const RoleSelection: React.FC<RoleSelectionProps> = ({ user, onRoleSelected }) => {
  const [selectedRole, setSelectedRole] = useState<'user' | 'creator' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const handleRoleSelection = async (role: 'user' | 'creator') => {
    setIsLoading(true);
    
    try {
      // Thử cập nhật Firestore trước
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, { 
        role: role,
        roleSelectedAt: new Date(),
        needsRoleSelection: false, // Clear the flag
        status: 'active',
        email: user.email,
        displayName: user.displayName,
        updatedAt: new Date()
      }, { merge: true });

      // Cập nhật Redux store
      dispatch(setRole(role));
      console.log('Role updated in Redux:', role);
      
      // Lưu vào localStorage như backup
      localStorage.setItem(`user_role_${user.uid}`, role);
      
      // Call callback với role để parent có thể navigate
      toast.success(t('auth.roleSelection.welcomeWithRole', { role: role === 'user' ? t('auth.roleSelection.userRole.title') : t('auth.roleSelection.creatorRole.title') }));
      
      // Gọi callback ngay lập tức, không delay
      onRoleSelected(role);
      
    } catch (error: any) {
      console.error('Error updating user role:', error);
      
      // Nếu Firestore fail, vẫn lưu role vào localStorage và Redux
      console.warn('Firestore update failed, using localStorage fallback');
      
      // Cập nhật Redux store
      dispatch(setRole(role));
      console.log('Role updated in Redux (fallback):', role);
      
      // Lưu vào localStorage 
      localStorage.setItem(`user_role_${user.uid}`, role);
      
      // Call callback với role để parent có thể navigate
      toast.success(t('auth.roleSelection.welcomeWithRole', { role: role === 'user' ? t('auth.roleSelection.userRole.title') : t('auth.roleSelection.creatorRole.title') }));
      
      // Gọi callback ngay lập tức, không delay
      onRoleSelected(role);
      
      // Hiển thị thông báo nhẹ nhàng nếu sync notifications được bật
      const showSyncNotif = localStorage.getItem('showSyncNotifications') === 'true';
      if (showSyncNotif) {
        toast.info(t('auth.roleSelection.syncPending'));
      }
      
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{t('roleSelection.title')}</h2>
          <p className="text-gray-600">{t('roleSelection.subtitle')}</p>
        </div>

        <div className="space-y-4">
          {/* User Role */}
          <div 
            className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
              selectedRole === 'user' 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
            onClick={() => setSelectedRole('user')}
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800 mb-1">{t('roleSelection.userRole.title')}</h3>
                <p className="text-sm text-gray-600">
                  {t('roleSelection.userRole.description')}
                </p>
                <ul className="mt-2 text-xs text-gray-500 space-y-1">
                  <li>{t('roleSelection.userRole.features.takeQuizzes')}</li>
                  <li>{t('roleSelection.userRole.features.viewHistory')}</li>
                  <li>{t('roleSelection.userRole.features.trackProgress')}</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Creator Role */}
          <div 
            className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
              selectedRole === 'creator' 
                ? 'border-purple-500 bg-purple-50' 
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
            onClick={() => setSelectedRole('creator')}
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800 mb-1">{t('roleSelection.creatorRole.title')}</h3>
                <p className="text-sm text-gray-600">
                  {t('roleSelection.creatorRole.description')}
                </p>
                <ul className="mt-2 text-xs text-gray-500 space-y-1">
                  <li>{t('roleSelection.creatorRole.features.allUserRights')}</li>
                  <li>{t('roleSelection.creatorRole.features.createQuizzes')}</li>
                  <li>{t('roleSelection.creatorRole.features.manageQuizzes')}</li>
                  <li>{t('roleSelection.creatorRole.features.needsApproval')}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex space-x-3">
          <button
            onClick={() => selectedRole && handleRoleSelection(selectedRole)}
            disabled={!selectedRole || isLoading}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${
              selectedRole && !isLoading
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Đang thiết lập vai trò...
              </div>
            ) : (
              'Xác nhận vai trò'
            )}
          </button>
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            {t('roleSelection.canChangeRoleLater')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;

