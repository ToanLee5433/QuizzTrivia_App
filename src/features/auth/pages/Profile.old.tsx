import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../lib/store';

import { QuizResult } from '../../quiz/types';
import { Link } from 'react-router-dom';
import { fetchUserQuizResults } from '../../quiz/store';
import { updateProfile, updatePassword } from 'firebase/auth';
import { auth } from '../../../lib/firebase/config';
import { toast } from 'react-toastify';
import AchievementSystem from '../../../shared/components/AchievementSystem';

const Profile: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const userResults = useSelector((state: RootState) => state.quiz.userResults);
  const dispatch = useDispatch();
  const [results, setResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [tab, setTab] = useState<'info' | 'edit' | 'password' | 'avatar' | 'achievements'>('info');
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [newPassword, setNewPassword] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(user?.photoURL || '');
  const [saving, setSaving] = useState(false);
  
  // Pagination states
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showAll, setShowAll] = useState(false);

  // Luôn fetch lại quiz results khi vào profile (nếu user đã đăng nhập)
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    dispatch(fetchUserQuizResults(user.uid) as any);
  }, [user, dispatch]);

  // Khi userResults trong Redux thay đổi, cập nhật lại kết quả và thống kê
  useEffect(() => {
    if (!user) return;
    console.log('🔍 Profile: userResults update:', userResults);
    setResults(userResults);
    // Tính toán thống kê
    const totalQuizzes = userResults.length;
    const totalScore = userResults.reduce((sum, r) => {
      console.log('📊 Score for result:', r.id, '=', r.score);
      return sum + (r.score || 0);
    }, 0);
    const totalCorrect = userResults.reduce((sum, r) => sum + (r.correctAnswers || 0), 0);
    const totalQuestions = userResults.reduce((sum, r) => sum + (r.totalQuestions || 0), 0);
    const totalTime = userResults.reduce((sum, r) => sum + (r.timeSpent || 0), 0);
    const bestScore = userResults.reduce((max, r) => Math.max(max, r.score || 0), 0);
    console.log('📈 Profile stats calculated:', { totalQuizzes, totalScore, averageScore: totalScore / totalQuizzes });
    setStats({
      totalQuizzes,
      averageScore: totalQuizzes > 0 ? Math.round((totalScore / totalQuizzes) * 10) / 10 : 0,
      totalCorrect,
      totalQuestions,
      totalTime,
      bestScore,
    });
    setLoading(false);
  }, [user, userResults]);

  // Đổi tên
  const handleChangeName = async () => {
    if (!displayName.trim()) {
      toast.error('Tên không được để trống!');
      return;
    }
    setSaving(true);
    try {
      await updateProfile(auth.currentUser!, { displayName });
      toast.success('Đổi tên thành công!');
      setTab('info');
      window.location.reload();
    } catch (e) {
      toast.error('Lỗi khi đổi tên!');
    } finally {
      setSaving(false);
    }
  };
  // Đổi mật khẩu
  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error('Mật khẩu phải từ 6 ký tự!');
      return;
    }
    setSaving(true);
    try {
      await updatePassword(auth.currentUser!, newPassword);
      toast.success('Đổi mật khẩu thành công!');
      setTab('info');
    } catch (e) {
      toast.error('Lỗi khi đổi mật khẩu!');
    } finally {
      setSaving(false);
    }
  };
  // Đổi avatar (chỉ đổi URL, có thể mở rộng upload sau)
  const handleChangeAvatar = async () => {
    if (!avatarUrl.trim()) {
      toast.error('Vui lòng nhập link ảnh!');
      return;
    }
    setSaving(true);
    try {
      await updateProfile(auth.currentUser!, { photoURL: avatarUrl });
      toast.success('Đổi avatar thành công!');
      setTab('info');
      window.location.reload();
    } catch (e) {
      toast.error('Lỗi khi đổi avatar!');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return <div className="p-8 text-center">Bạn cần đăng nhập để xem thông tin cá nhân.</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-indigo-100 py-8 px-2 md:px-0">
      <div className="max-w-3xl mx-auto">
        {/* Banner + Avatar */}
        <div className="relative bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-lg mb-8 h-40 flex items-end">
          <div className="absolute left-8 -bottom-10">
            <div className="h-24 w-24 rounded-full bg-white shadow-lg flex items-center justify-center text-4xl font-bold text-blue-600 border-4 border-white overflow-hidden">
              {user.photoURL ? (
                <img src={user.photoURL} alt="avatar" className="w-full h-full object-cover rounded-full" />
              ) : (
                user.displayName ? user.displayName.charAt(0).toUpperCase() : (user.email ? user.email.charAt(0).toUpperCase() : '?')
              )}
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-8 pt-16 -mt-12">
          {/* Tabs */}
          <div className="flex gap-3 mb-8">
            <button className={`px-4 py-2 rounded font-semibold ${tab==='info'?'bg-blue-100 text-blue-700':'bg-gray-100 text-gray-700'}`} onClick={()=>setTab('info')}>Thông tin</button>
            <button className={`px-4 py-2 rounded font-semibold ${tab==='achievements'?'bg-blue-100 text-blue-700':'bg-gray-100 text-gray-700'}`} onClick={()=>setTab('achievements')}>🏆 Thành tích</button>
            <button className={`px-4 py-2 rounded font-semibold ${tab==='edit'?'bg-blue-100 text-blue-700':'bg-gray-100 text-gray-700'}`} onClick={()=>setTab('edit')}>Đổi tên</button>
            <button className={`px-4 py-2 rounded font-semibold ${tab==='password'?'bg-blue-100 text-blue-700':'bg-gray-100 text-gray-700'}`} onClick={()=>setTab('password')}>Đổi mật khẩu</button>
            <button className={`px-4 py-2 rounded font-semibold ${tab==='avatar'?'bg-blue-100 text-blue-700':'bg-gray-100 text-gray-700'}`} onClick={()=>setTab('avatar')}>Đổi avatar</button>
          </div>
          {/* Tab content */}
          {tab === 'info' && (
            <>
              {/* Info cá nhân */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                    {user.displayName || 'Chưa đặt tên'}
                    <span className="ml-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 capitalize">{user.role}</span>
                  </h1>
                  {user.email && <div className="text-gray-600 mt-1">{user.email}</div>}
                </div>
                <div className="flex flex-col gap-2 text-sm text-gray-500">
                  {'createdAt' in user && (typeof user['createdAt'] === 'string' || typeof user['createdAt'] === 'number') && (
                    <div><span className="font-medium text-gray-700">Ngày tạo:</span> {new Date(user['createdAt']).toLocaleDateString()}</div>
                  )}
                  <div><span className="font-medium text-gray-700">ID:</span> {user.uid}</div>
                </div>
              </div>

              {/* Thống kê hoạt động */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-700">{stats ? stats.totalQuizzes : '--'}</div>
                  <div className="text-gray-600 text-sm">Quiz đã làm</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-700">{stats ? stats.averageScore : '--'}%</div>
                  <div className="text-gray-600 text-sm">Điểm trung bình</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-700">{stats ? stats.totalCorrect : '--'}</div>
                  <div className="text-gray-600 text-sm">Câu đúng</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-700">{stats ? Math.round((stats.totalTime || 0) / 60) : '--'} phút</div>
                  <div className="text-gray-600 text-sm">Tổng thời gian</div>
                </div>
              </div>

              {/* Thành tích nổi bật */}
              <div className="mb-8">
                <div className="font-semibold text-gray-800 mb-2">Thành tích nổi bật</div>
                <div className="flex gap-3 flex-wrap">
                  <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Best Score: {stats ? stats.bestScore : '--'}%</div>
                  {/* Có thể thêm các badge khác ở đây */}
                </div>
              </div>

              {/* Lịch sử quiz đã làm */}
              <div>
                <div className="font-semibold text-gray-800 mb-2">Lịch sử quiz đã làm</div>
                {loading ? (
                  <div className="flex gap-2">
                    {Array.from({length: 3}).map((_,i) => (
                      <div key={i} className="flex-1 bg-gray-100 animate-pulse h-20 rounded-lg" />
                    ))}
                  </div>
                ) : results.length === 0 ? (
                  <div className="text-gray-500">Chưa có dữ liệu quiz đã làm.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quiz</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Điểm</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Câu đúng</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Thời gian</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ngày</th>
                          <th className="px-4 py-2"></th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {(showAll ? results : results.slice(0, itemsPerPage)).map(r => (
                          <tr key={r.id}>
                            <td className="px-4 py-2 font-medium text-gray-900">{r.quizId || 'N/A'}</td>
                            <td className="px-4 py-2 font-bold text-lg">
                              {r.score !== undefined && r.score !== null ? `${Math.round(r.score)}%` : 'N/A'}
                            </td>
                            <td className="px-4 py-2">{r.correctAnswers || 0}/{r.totalQuestions || 0}</td>
                            <td className="px-4 py-2">{Math.round((r.timeSpent || 0) / 60)} phút</td>
                            <td className="px-4 py-2">{
                              r.completedAt
                                ? (r.completedAt instanceof Date
                                    ? r.completedAt.toLocaleDateString()
                                    : (typeof r.completedAt === 'string' || typeof r.completedAt === 'number')
                                      ? new Date(r.completedAt).toLocaleDateString()
                                      : '')
                                : ''
                            }</td>
                            <td className="px-4 py-2">
                              <Link to={`/results/${r.id}`} className="text-blue-600 hover:underline text-sm">Xem lại</Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    
                    {/* Pagination Controls */}
                    {results.length > itemsPerPage && (
                      <div className="mt-4 flex justify-between items-center">
                        <div className="text-sm text-gray-600">
                          Hiển thị {showAll ? results.length : Math.min(itemsPerPage, results.length)} / {results.length} kết quả
                        </div>
                        <div className="flex gap-2">
                          <select
                            value={itemsPerPage}
                            onChange={(e) => setItemsPerPage(Number(e.target.value))}
                            className="px-3 py-1 border border-gray-300 rounded text-sm"
                          >
                            <option value={10}>10 / trang</option>
                            <option value={25}>25 / trang</option>
                            <option value={50}>50 / trang</option>
                            <option value={100}>100 / trang</option>
                          </select>
                          <button
                            onClick={() => setShowAll(!showAll)}
                            className="px-4 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                          >
                            {showAll ? 'Thu gọn' : 'Xem tất cả'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
          {tab === 'edit' && (
            <div className="max-w-md mx-auto">
              <h2 className="text-xl font-bold mb-4">Đổi tên hiển thị</h2>
              <input
                className="w-full border p-2 rounded mb-4"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Nhập tên mới..."
              />
              <button
                className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 disabled:opacity-50"
                onClick={handleChangeName}
                disabled={saving}
              >{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
            </div>
          )}
          {tab === 'password' && (
            <div className="max-w-md mx-auto">
              <h2 className="text-xl font-bold mb-4">Đổi mật khẩu</h2>
              <input
                className="w-full border p-2 rounded mb-4"
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới..."
              />
              <button
                className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 disabled:opacity-50"
                onClick={handleChangePassword}
                disabled={saving}
              >{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
            </div>
          )}
          {tab === 'avatar' && (
            <div className="max-w-md mx-auto">
              <h2 className="text-xl font-bold mb-4">Đổi avatar</h2>
              <input
                className="w-full border p-2 rounded mb-4"
                value={avatarUrl}
                onChange={e => setAvatarUrl(e.target.value)}
                placeholder="Dán link ảnh mới..."
              />
              <button
                className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 disabled:opacity-50"
                onClick={handleChangeAvatar}
                disabled={saving}
              >{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
            </div>
          )}

          {tab === 'achievements' && (
            <div>
              <AchievementSystem />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;