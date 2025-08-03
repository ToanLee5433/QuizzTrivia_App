import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../lib/store';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../../lib/firebase/config';
import { logout } from '../store';
import { toast } from 'react-toastify';

/**
 * Component này sẽ tự động kiểm tra trạng thái isActive của user mỗi 5s.
 * Nếu user bị khoá, sẽ tự động logout và hiển thị thông báo.
 */
const AutoLogoutOnBan = () => {
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
            dispatch(logout());
            toast.error('Tài khoản của bạn đã bị khoá. Vui lòng liên hệ quản trị viên.');
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
  }, [user?.uid, dispatch]);

  return null;
};

export default AutoLogoutOnBan;
