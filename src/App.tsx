import React, { useEffect, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { store, RootState } from './lib/store';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './lib/firebase/config';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { loginSuccess, logout, authCheckComplete } from './features/auth/store';
import I18nProvider from './shared/components/I18nProvider';
import { SettingsProvider } from './contexts/SettingsContext';

// Stage 1: Basic Landing & Authentication
import { LandingPage } from './shared/pages/LandingPage';

// Stage 2: Authentication Pages
import AuthPageNew from './features/auth/pages/AuthPageNew';

// Removed RegisterPage import as the file has been deleted
// Stage 2: Basic User Features - Lazy loaded
const Dashboard = React.lazy(() => import('./shared/pages/Dashboard'));
const QuizList = React.lazy(() => import('./features/quiz/pages/QuizList'));
const QuizPage = React.lazy(() => import('./features/quiz/pages/QuizPage'));
const QuizPreviewPage = React.lazy(() => import('./features/quiz/pages/QuizPreviewPage'));
const QuizReviewsPage = React.lazy(() => import('./features/quiz/pages/QuizReviewsPage'));
const RealQuizListPage = React.lazy(() => import('./features/quiz/pages/RealQuizListPage'));
const QuizResultViewer = React.lazy(() => import('./features/quiz/pages/QuizResultViewer'));
const LearningMaterialsPage = React.lazy(() => import('./features/quiz/pages/LearningMaterialsPage'));
const Profile = React.lazy(() => import('./features/auth/pages/Profile'));
const SettingsPage = React.lazy(() => import('./features/settings/pages/SettingsPage'));
const FavoritesPage = React.lazy(() => import('./features/quiz/pages/FavoritesPage'));
const LeaderboardPage = React.lazy(() => import('./features/quiz/pages/LeaderboardPage'));

// Stage 3: Creator Features (REMOVED - Creator role eliminated)
const CreateQuizPage = React.lazy(() => import('./features/quiz/pages/CreateQuizPage'));

// Offline Management
import { OfflineIndicator } from './components/OfflineIndicator';
const OfflineQueuePage = React.lazy(() => import('./pages/OfflineQueuePage'));
const EditQuizPageAdvanced = React.lazy(() => import('./features/quiz/pages/EditQuizPageAdvanced'));
const CreatorLayout = React.lazy(() => import('./features/creator/layouts/CreatorLayout'));

// Stage 4: New Features - Offline & Multiplayer - NEW MODERN SYSTEM
const ModernMultiplayerPage = React.lazy(() => import('./features/multiplayer/modern/components/ModernMultiplayerPage'));
const MyQuizzesPage = React.lazy(() => import('./features/quiz/pages/MyQuizzesPage'));
const QuizDetailedStats = React.lazy(() => import('./features/quiz/pages/QuizDetailedStats'));

// Flashcard Feature
const FlashcardPage = React.lazy(() => import('./features/flashcard/pages/FlashcardPage'));

// Stage 4: Admin Features - All lazy loaded for better performance
const Admin = React.lazy(() => import('./features/admin/pages/Admin'));
const AdminQuizManagement = React.lazy(() => import('./features/admin/pages/AdminQuizManagement'));
const AdminUserManagement = React.lazy(() => import('./features/admin/pages/AdminUserManagement'));
const BuildIndexPage = React.lazy(() => import('./features/admin/pages/BuildIndexPage'));

// RAG Chatbot
import { ChatbotButton } from './components/rag';
import MusicPlayer from './components/MusicPlayer';
const StatsDashboard = React.lazy(() => import('./features/admin/pages/StatsDashboard'));
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
import RoleBasedRedirect from './shared/components/RoleBasedRedirect';
import ScrollToTop from './shared/components/ScrollToTop';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { initializeAutoSync, cleanupAutoSync } from './shared/services/autoSync';
import { usePresence } from './hooks/usePresence';

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useDispatch();
  
  // ✅ Facebook-style Presence System using Firebase RTDB
  usePresence();

  useEffect(() => {
    const mounted = true;
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
          displayName: user.displayName,
          emailVerified: user.emailVerified
        } : null,
        timestamp: new Date().toISOString()
      });
      
      if (user) {
        try {
          // Get role from Firestore trước khi check email verification
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          
          let role: 'admin' | 'creator' | 'user' = 'user';
          let userData = null;
          
          if (userDoc.exists()) {
            userData = userDoc.data();
            
            // Sync Firebase Auth metadata to Firestore
            try {
              const metadata = user.metadata;
              if (metadata.creationTime && !userData.authCreatedAt) {
                await updateDoc(userDocRef, {
                  authCreatedAt: metadata.creationTime,
                  lastSynced: new Date().toISOString()
                });
                console.log(' Synced Firebase Auth metadata to Firestore');
              }
            } catch (syncError) {
              console.error('Error syncing metadata:', syncError);
            }
            
            // Check if user is deleted or inactive
            if (userData.isDeleted || userData.isActive === false) {
              console.log(' User account is deleted/inactive, logging out');
              await auth.signOut();
              dispatch(logout());
              dispatch(authCheckComplete());
              return;
            }
            
            role = userData.role || 'user';
            console.log(' Found user document:', { uid: user.uid, role, userData });
            
            // Chỉ check email verification cho user thường, không phải admin
            if (!user.emailVerified && user.email !== 'admin123@gmail.com' && role !== 'admin') {
              console.log(' Email not verified for regular user, redirecting to verification');
              // Không sign out ngay, để user có cơ hội verify email
              // await auth.signOut();
              // dispatch(logout());
              // dispatch(authCheckComplete());
              // return;
            }
          } else if (user.email === 'admin123@gmail.com') {
            role = 'admin';
            console.log(' Creating admin user document');
            // Create admin document if it doesn't exist
            try {
              await setDoc(userDocRef, {
                email: user.email,
                displayName: user.displayName || 'Admin',
                role: 'admin',
                createdAt: serverTimestamp(), // Sử dụng serverTimestamp thay vì Date
                isActive: true,
                emailVerified: true
              });
            } catch (createError) {
              console.error('Error creating admin document:', createError);
            }
          } else {
            // User mới chưa có document trong Firestore - có thể là user vừa đăng ký
            console.log('🆕 User document not found for:', user.email);
            
            // Không tự động tạo document nữa, để LoginPage xử lý
            // Chỉ fallback nếu là admin email đặc biệt
            if (user.email === 'admin123@gmail.com') {
              console.log('👑 Creating admin user document');
              try {
                await setDoc(userDocRef, {
                  email: user.email,
                  displayName: user.displayName || 'Admin',
                  role: 'admin',
                  createdAt: serverTimestamp(), // Sử dụng serverTimestamp thay vì Date
                  isActive: true
                });
                role = 'admin';
              } catch (createError) {
                console.error('Error creating admin document:', createError);
              }
            } else {
              // User thường không có document - có thể chưa hoàn thành đăng ký
              console.log('⚠️ Regular user without document, might need role selection');
              // Không set role, để component xử lý
              role = undefined as any;
            }
          }

          const authUser = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            emailVerified: user.emailVerified,
            role: role,
            needsRoleSelection: userData?.needsRoleSelection || (!role && role !== 'admin'), // Admin không cần chọn role
            createdAt: userData?.createdAt ? 
              (userData.createdAt.toDate ? userData.createdAt.toDate().toISOString() : 
               userData.createdAt instanceof Date ? userData.createdAt.toISOString() : 
               userData.createdAt) : 
              new Date().toISOString(), // Convert Date to ISO string
          };
          
          console.log('📝 Dispatching loginSuccess with:', authUser);
          dispatch(loginSuccess(authUser));
          
          // Initialize auto-sync for this user
          initializeAutoSync(user.uid);
        } catch (error) {
          console.error('Error getting user role:', error);
          // Fallback role với check admin email chính xác hơn
          const fallbackRole: 'admin' | 'user' = user.email === 'admin123@gmail.com' ? 'admin' : 'user';
          const authUser = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            emailVerified: user.emailVerified,
            role: fallbackRole,
            createdAt: new Date().toISOString(), // Convert Date to ISO string
          };
          
          console.log('📝 Dispatching fallback loginSuccess with:', authUser);
          dispatch(loginSuccess(authUser));
          
          // Initialize auto-sync for fallback user too
          initializeAutoSync(user.uid);
        }
      } else {
        dispatch(logout());
        // Cleanup auto-sync on logout
        cleanupAutoSync();
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
const LoadingFallback = () => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <span className="ml-3 text-lg font-medium text-gray-700">{t('loading', 'Đang tải...')}</span>
    </div>
  );
};

// Cập nhật AppContent để đảm bảo mọi lazy component đều được bọc trong Suspense
const AppContent: React.FC = () => {
  const { t } = useTranslation();
  const { user, isLoading, authChecked, isAuthenticated, needsRoleSelection } = useSelector((state: RootState) => state.auth);

  console.log('📱 AppContent render:', {
    user: user ? { uid: user.uid, email: user.email, role: user.role } : null,
    isLoading,
    authChecked,
    isAuthenticated,
    needsRoleSelection
  });

  // Show loading while checking authentication
  if (isLoading || !authChecked) {
    console.log('📱 App: Showing loading screen', { isLoading, authChecked });
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
          <div className="text-xl font-semibold text-gray-700">{t('loadingData', 'Đang tải dữ liệu...')}</div>
          <div className="text-sm text-gray-500 mt-2">{t('pleaseWait', 'Vui lòng đợi một chút')}</div>
          {isLoading && <div className="text-xs text-gray-400 mt-1">{t('checkingAuth', 'Đang kiểm tra xác thực...')}</div>}
        </div>
      </div>
    );
  }

  // Show role selection if user needs to choose a role
  if (isAuthenticated && user && needsRoleSelection) {
    console.log('📱 App: Showing role selection screen');
    
    const handleRoleSelected = (role: 'user' | 'creator') => {
      console.log('🎯 Role selected:', role);
      
      // Navigate theo role với proper redirect
      setTimeout(() => {
        if (role === 'creator') {
          window.location.href = '/creator';
        } else if (role === 'user') {
          window.location.href = '/dashboard';
        }
      }, 1500); // Increase delay để user thấy được toast message
    };
    
    return <RoleSelection user={user} onRoleSelected={handleRoleSelected} />;
  }

  return (
    <div>
      <OfflineIndicator className="fixed top-4 right-4 z-50" />
      <Routes>
        {/* Stage 1: Landing Routes */}
        <Route path="/landing" element={<LandingPage />} />
        
        {/* Stage 2: Authentication Routes */}
        <Route path="/login" element={!isAuthenticated ? <AuthPageNew /> : <Navigate to="/dashboard" replace />} />
        
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
        
        <Route path="/settings" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <SettingsPage />
            </Suspense>
          </ProtectedRoute>
        } />
        
        {/* <Route path="/offline" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <OfflineSettingsPage />
            </Suspense>
          </ProtectedRoute>
        } /> */}
        
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
        
        <Route path="/quiz/:id/learn" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <LearningMaterialsPage />
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
        
        <Route path="/quiz/:id/flashcards" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <FlashcardPage />
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
        
        <Route path="/quiz-result/:resultId" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <QuizResultViewer />
            </Suspense>
          </ProtectedRoute>
        } />
        
        {/* Stage 3: Creator Routes - NEW NESTED STRUCTURE */}
        
        <Route path="/creator" element={
          <Suspense fallback={<LoadingFallback />}>
            <CreatorLayout />
          </Suspense>
        }>
          {/* Index route redirects to my-quizzes */}
          <Route index element={<Navigate to="my" replace />} />
          
          {/* My Quizzes sub-route */}
          <Route path="my" element={
            <Suspense fallback={<LoadingFallback />}>
              <MyQuizzesPage />
            </Suspense>
          } />
          
          {/* Create New Quiz sub-route */}
          <Route path="new" element={
            <Suspense fallback={<LoadingFallback />}>
              <CreateQuizPage />
            </Suspense>
          } />
        </Route>

        {/* Legacy route redirects for backward compatibility */}
        <Route path="/create-quiz" element={<Navigate to="/creator/new" replace />} />
        <Route path="/my-quizzes" element={<Navigate to="/creator/my" replace />} />

        <Route path="/quiz-stats/:id" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <QuizDetailedStats />
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
        
        <Route path="/admin/build-index" element={
          <AdminProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <BuildIndexPage />
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
        
        {/* Stage 4: New Features - Offline & Multiplayer - NEW MODERN SYSTEM */}
        <Route path="/offline" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <OfflineQueuePage />
            </Suspense>
          </ProtectedRoute>
        } />
        
        <Route path="/multiplayer" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <ModernMultiplayerPage />
            </Suspense>
          </ProtectedRoute>
        } />
        
        <Route path="/multiplayer/:roomId" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <ModernMultiplayerPage />
            </Suspense>
          </ProtectedRoute>
        } />
        
        {/* Stage 5: Utility & Error Routes */}
        <Route path="/role-selection" element={
          <ProtectedRoute>
            {user && (
              <RoleSelection 
                user={user} 
                onRoleSelected={(role) => {
                  if (role === 'creator') {
                    window.location.href = '/creator';
                  } else if (role === 'user') {
                    window.location.href = '/dashboard';
                  }
                }} 
              />
            )}
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
        
        {/* Default route - role-based redirect */}
        <Route path="/" element={<RoleBasedRedirect />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
};

function App() {
  return (
    <Router>
      <Provider store={store}>
        <SettingsProvider>
          <I18nProvider>
            <AuthProvider>
              <ErrorBoundary>
                <div className="app-container">
                  <NotificationBanner />
                  {/* <OfflineStatusIndicator /> */}
                  <ScrollToTop />
                  <Layout>
                    <AutoLogoutOnBan />
                    <AppContent />
                    <ToastContainer position="top-right" autoClose={3000} hideProgressBar newestOnTop closeOnClick pauseOnFocusLoss draggable pauseOnHover aria-label="notification" />
                  </Layout>
                  {/* AI Chatbot - Floating button at bottom-right */}
                  <ChatbotButton />
                  {/* Music Player - Draggable floating player */}
                  <MusicPlayer />
                </div>
              </ErrorBoundary>
            </AuthProvider>
          </I18nProvider>
        </SettingsProvider>
      </Provider>
    </Router>
  );
}

export default App;