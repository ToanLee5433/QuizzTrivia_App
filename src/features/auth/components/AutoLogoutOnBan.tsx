import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../lib/store';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../../lib/firebase/config';
import { logout } from '../store';
import { toast } from 'react-toastify';
import { setUserOffline } from '../../../utils/presenceUtils';
import { useTranslation } from 'react-i18next';

/**
 * Component này sẽ tự động kiểm tra trạng thái isActive của user mỗi 5s.
 * Nếu user bị khoá, sẽ tự động logout và hiển thị thông báo.
 */
const AutoLogoutOnBan = () => {
  const { t } = useTranslation();
  const user = useSelector((state: RootState) => state.auth.user);
  const dispatch = useDispatch();

  useEffect(() => {
    if (!user?.uid) return;
    let interval: NodeJS.Timeout;
    let isUnmounted = false;

    const checkActive = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        if (userData && userData.isActive === false) {
          if (!isUnmounted) {
            // Set presence to offline before logout
            if (auth.currentUser) {
              await setUserOffline(auth.currentUser.uid);
            }
            
            dispatch(logout());
            toast.error(t('auth.accountBanned'));
            if (auth.currentUser) await auth.signOut();
          }
        }
      } catch (err) {
        // ignore
      }
    };
    checkActive();
    interval = setInterval(checkActive, 5000);
    return () => {
      isUnmounted = true;
      clearInterval(interval);
    };
  }, [user?.uid, dispatch, t]);

  return null;
};

export default AutoLogoutOnBan;
