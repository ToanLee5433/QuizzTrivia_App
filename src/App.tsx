import React, { useEffect, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { store, RootState } from './lib/store';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './lib/firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { loginSuccess, logout, authCheckComplete } from './features/auth/store';

// Stage 1: Basic Landing & Authentication
import { LandingPage } from './shared/pages/LandingPage';
import Home from './shared/pages/Home';

// Stage 2: Authentication Pages
import { LoginPage } from './features/auth/pages/LoginPage';

// Removed RegisterPage import as the file has been deleted
// Stage 2: Basic User Features - Lazy loaded
const Dashboard = React.lazy(() => import('./shared/pages/Dashboard'));
const QuizList = React.lazy(() => import('./features/quiz/pages/QuizList'));
const QuizPage = React.lazy(() => import('./features/quiz/pages/QuizPage'));
const QuizPreviewPage = React.lazy(() => import('./features/quiz/pages/QuizPreviewPage'));
const QuizReviewsPage = React.lazy(() => import('./features/quiz/pages/QuizReviewsPage'));
const ReviewTestPage = React.lazy(() => import('./features/quiz/pages/ReviewTestPage'));
const RealQuizListPage = React.lazy(() => import('./features/quiz/pages/RealQuizListPage'));
const ResultPage = React.lazy(() => import('./features/quiz/pages/ResultPage'));
const Profile = React.lazy(() => import('./features/auth/pages/Profile'));
const FavoritesPage = React.lazy(() => import('./features/quiz/pages/FavoritesPage'));
const LeaderboardPage = React.lazy(() => import('./features/quiz/pages/LeaderboardPage'));

// Stage 3: Creator Features (REMOVED - Creator role eliminated)
const CreateQuizPage = React.lazy(() => import('./features/quiz/pages/CreateQuizPage'));
const EditQuizPageAdvanced = React.lazy(() => import('./features/quiz/pages/EditQuizPageAdvanced'));

// Stage 4: Admin Features  
import Admin from './features/admin/pages/Admin';
import AdminQuizManagement from './features/admin/pages/AdminQuizManagement';
import AdminUserManagement from './features/admin/pages/AdminUserManagement';
import StatsDashboard from './features/admin/pages/StatsDashboard';
const CategoryManagement = React.lazy(() => import('./features/admin/pages/CategoryManagement'));
const AdminStats = React.lazy(() => import('./features/admin/components/AdminStats'));
const AdminUtilities = React.lazy(() => import('./features/admin/components/AdminUtilities'));

// Stage 5: Advanced Components
import { Layout } from './shared/components/layout/Layout';
import { NotFound } from './shared/components/layout/NotFound';
import ErrorBoundary from './shared/components/ErrorBoundary';
import RoleSelection from './features/auth/components/RoleSelection';
import ProtectedRoute from './features/auth/components/ProtectedRoute';
import AutoLogoutOnBan from './features/auth/components/AutoLogoutOnBan';
import AdminProtectedRoute from './features/admin/components/AdminProtectedRoute';
import NotificationBanner from './shared/components/NotificationBanner';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useDispatch();

  useEffect(() => {
    let mounted = true;
    // Set timeout để tránh loading vô hạn
    const timeout = setTimeout(() => {
      if (mounted) {
        dispatch(authCheckComplete());
      }
    }, 5000); // Tăng lên 5 giây để đảm bảo đủ thời gian

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!mounted) return;
      clearTimeout(timeout); // Clear timeout nếu auth check thành công
      
      console.log('🔐 Auth state changed:', {
        user: user ? {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName
        } : null,
        timestamp: new Date().toISOString()
      });
      
      if (user) {
        try {
          // Get role from Firestore
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          
          let role: 'admin' | 'user' = 'user';
          let userData = null;
          
          if (userDoc.exists()) {
            userData = userDoc.data();
            role = userData.role || 'user';
            console.log('✅ Found user document:', { uid: user.uid, role, userData });
          } else if (user.email === 'admin123@gmail.com') {
            role = 'admin';
            console.log('👑 Creating admin user document');
            // Create admin document if it doesn't exist
            try {
              await setDoc(userDocRef, {
                email: user.email,
                displayName: user.displayName || 'Admin',
                role: 'admin',
                createdAt: new Date(),
                isActive: true
              });
            } catch (createError) {
              console.error('Error creating admin document:', createError);
            }
          } else {
            // User mới chưa có document trong Firestore, tạo mặc định
            console.log('🆕 Creating default user document for:', user.email);
            try {
              await setDoc(userDocRef, {
                email: user.email,
                displayName: user.displayName || 'User',
                role: 'user',
                createdAt: new Date(),
                isActive: true
              });
              role = 'user';
            } catch (createError) {
              console.error('Error creating user document:', createError);
            }
          }

          const authUser = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            emailVerified: user.emailVerified,
            role: role,
          };
          
          console.log('📝 Dispatching loginSuccess with:', authUser);
          dispatch(loginSuccess(authUser));
        } catch (error) {
          console.error('Error getting user role:', error);
          // Fallback role
          const fallbackRole = user.email === 'admin123@gmail.com' ? 'admin' : 'user';
          dispatch(loginSuccess({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            emailVerified: user.emailVerified,
            role: fallbackRole,
          }));
        }
      } else {
        dispatch(logout());
      }
      dispatch(authCheckComplete());
    });
    
    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, [dispatch]);

  return <>{children}</>;
};

// Thêm LoadingFallback component nếu chưa có
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    <span className="ml-3 text-lg font-medium text-gray-700">Đang tải...</span>
  </div>
);

// Cập nhật AppContent để đảm bảo mọi lazy component đều được bọc trong Suspense
const AppContent: React.FC = () => {
  const { user, isLoading, authChecked, isAuthenticated } = useSelector((state: RootState) => state.auth);

  console.log('📱 AppContent render:', {
    user: user ? { uid: user.uid, email: user.email, role: user.role } : null,
    isLoading,
    authChecked,
    isAuthenticated
  });

  // Show loading while checking authentication
  if (isLoading || !authChecked) {
    console.log('📱 App: Showing loading screen', { isLoading, authChecked });
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
          <div className="text-xl font-semibold text-gray-700">Đang tải dữ liệu...</div>
          <div className="text-sm text-gray-500 mt-2">Vui lòng đợi một chút</div>
          {isLoading && <div className="text-xs text-gray-400 mt-1">Đang kiểm tra xác thực...</div>}
        </div>
      </div>
    );
  }

  return (
    <div>
      <Routes>
        {/* Stage 1: Landing & Home Routes */}
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/home" element={<Home />} />
        
        {/* Stage 2: Authentication Routes */}
        <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/dashboard" replace />} />
        
        {/* Stage 2: Basic User Routes - Wrap with Suspense */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <Dashboard />
            </Suspense>
          </ProtectedRoute>
        } />
        
        <Route path="/profile" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <Profile />
            </Suspense>
          </ProtectedRoute>
        } />
        
        <Route path="/quizzes" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <QuizList />
            </Suspense>
          </ProtectedRoute>
        } />
        
        <Route path="/quiz/:id" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <QuizPage />
            </Suspense>
          </ProtectedRoute>
        } />
        
        <Route path="/quiz/:id/preview" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <QuizPreviewPage />
            </Suspense>
          </ProtectedRoute>
        } />
        
        <Route path="/quiz/:id/reviews" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <QuizReviewsPage />
            </Suspense>
          </ProtectedRoute>
        } />
        
        <Route path="/test-reviews/:quizId" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <ReviewTestPage />
            </Suspense>
          </ProtectedRoute>
        } />
        
        <Route path="/real-quizzes" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <RealQuizListPage />
            </Suspense>
          </ProtectedRoute>
        } />
        
        <Route path="/quiz/:id/edit" element={
          <ProtectedRoute requiredRole="admin">
            <Suspense fallback={<LoadingFallback />}>
              <EditQuizPageAdvanced />
            </Suspense>
          </ProtectedRoute>
        } />
        
        <Route path="/results/:attemptId" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <ResultPage />
            </Suspense>
          </ProtectedRoute>
        } />
        
        {/* Stage 3: Creator Routes - REMOVED (Creator role eliminated) */}
        
        <Route path="/create-quiz" element={
          <ProtectedRoute requiredRole="admin">
            <Suspense fallback={<LoadingFallback />}>
              <CreateQuizPage />
            </Suspense>
          </ProtectedRoute>
        } />

        <Route path="/creator" element={
          <ProtectedRoute requiredRole="admin">
            <Suspense fallback={<LoadingFallback />}>
              <CreateQuizPage />
            </Suspense>
          </ProtectedRoute>
        } />
        
        {/* Stage 4: Admin Routes - Wrap with Suspense */}
        <Route path="/admin" element={
          <AdminProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <Admin />
            </Suspense>
          </AdminProtectedRoute>
        } />
        
        {/* Redirect old admin/dashboard to admin/quiz-management */}
        <Route path="/admin/dashboard" element={<Navigate to="/admin/quiz-management" replace />} />
        
        <Route path="/admin/quiz-management" element={
          <AdminProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <AdminQuizManagement />
            </Suspense>
          </AdminProtectedRoute>
        } />
        
        <Route path="/admin/users" element={
          <AdminProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <AdminUserManagement />
            </Suspense>
          </AdminProtectedRoute>
        } />
        
        <Route path="/admin/roles" element={
          <AdminProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <AdminUserManagement />
            </Suspense>
          </AdminProtectedRoute>
        } />
        
        <Route path="/admin/quiz-stats" element={
          <AdminProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <StatsDashboard />
            </Suspense>
          </AdminProtectedRoute>
        } />
        
        <Route path="/admin/categories" element={
          <AdminProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <CategoryManagement />
            </Suspense>
          </AdminProtectedRoute>
        } />
        
        <Route path="/admin/stats-test" element={
          <AdminProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <AdminStats />
            </Suspense>
          </AdminProtectedRoute>
        } />

        <Route path="/admin/utilities" element={
          <AdminProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <AdminUtilities />
            </Suspense>
          </AdminProtectedRoute>
        } />
        
        <Route path="/admin/edit-quiz/:id" element={
          <AdminProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <EditQuizPageAdvanced />
            </Suspense>
          </AdminProtectedRoute>
        } />
        
        {/* Admin/creators route REMOVED - Creator Management eliminated */}
        
        <Route path="/real-quizzes" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <RealQuizListPage />
            </Suspense>
          </ProtectedRoute>
        } />
        
        {/* Stage 5: Utility & Error Routes */}
        <Route path="/role-selection" element={
          <ProtectedRoute>
            <RoleSelection user={user!} onRoleSelected={() => window.location.reload()} />
          </ProtectedRoute>
        } />
        
        <Route path="/favorites" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <FavoritesPage />
            </Suspense>
          </ProtectedRoute>
        } />
        <Route path="/leaderboard" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <LeaderboardPage />
            </Suspense>
          </ProtectedRoute>
        } />
        
        {/* Default route - landing page */}
        <Route path="/" element={<LandingPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
};

function App() {
  return (
    <Router>
      <Provider store={store}>
        <AuthProvider>
          <ErrorBoundary>
            <div className="app-container">
              <NotificationBanner />
              <Layout>
                <AutoLogoutOnBan />
                <AppContent />
                <ToastContainer position="top-right" autoClose={3000} hideProgressBar newestOnTop closeOnClick pauseOnFocusLoss draggable pauseOnHover aria-label="notification" />
              </Layout>
            </div>
          </ErrorBoundary>
        </AuthProvider>
      </Provider>
    </Router>
  );
}

export default App;