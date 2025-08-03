import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase/config';
import QuizCard from '../components/QuizCard';
import { Quiz } from '../types';
import { FaCrown, FaUserCircle } from 'react-icons/fa';
import { useSelector } from 'react-redux';
import { RootState } from '../../../lib/store';


interface UserStat {
  userId: string;
  displayName?: string;
  totalScore: number;
  totalAttempts: number;
}

const LeaderboardPage: React.FC = () => {
  const [topUsers, setTopUsers] = useState<UserStat[]>([]);
  const [topQuizzes, setTopQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const { user } = useSelector((state: RootState) => state.auth);
  const [timeFilter, setTimeFilter] = useState<'all' | 'week' | 'month'>('all');
  const [search, setSearch] = useState('');
  
  // Pagination states
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [showAllQuizzes, setShowAllQuizzes] = useState(false);

  // Realtime top users
  useEffect(() => {
    setLoading(true);
    const unsubUsers = onSnapshot(
      query(collection(db, 'user_stats'), orderBy('totalScore', 'desc'), limit(100)), // Tăng từ 10 lên 100
      (snapshot) => {
        const users: UserStat[] = [];
        snapshot.forEach(doc => users.push(doc.data() as UserStat));
        setTopUsers(users);
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );
    return () => unsubUsers();
  }, []);

  // Realtime top quizzes
  useEffect(() => {
    setLoading(true);
    const unsubQuizzes = onSnapshot(
      query(collection(db, 'quizzes'), orderBy('attempts', 'desc'), limit(100)), // Tăng từ 10 lên 100
      (snapshot) => {
        const quizzes: Quiz[] = [];
        snapshot.forEach(doc => quizzes.push({ ...(doc.data() as Quiz), id: doc.id }));
        setTopQuizzes(quizzes);
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );
    return () => unsubQuizzes();
  }, []);

  // Thống kê tổng thể
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const usersSnap = await getDocs(collection(db, 'user_stats'));
        const quizzesSnap = await getDocs(collection(db, 'quizzes'));
        let totalUsers = 0, totalQuizzes = 0, totalAttempts = 0, totalScore = 0, totalPlays = 0;
        usersSnap.forEach(doc => {
          totalUsers++;
          const d = doc.data();
          totalScore += d.totalScore || 0;
          totalPlays += d.totalAttempts || 0;
        });
        quizzesSnap.forEach(doc => {
          totalQuizzes++;
          const d = doc.data();
          totalAttempts += d.attempts || 0;
        });
        setStats({
          totalUsers,
          totalQuizzes,
          totalAttempts,
          averageScore: totalPlays > 0 ? Math.round((totalScore / totalPlays) * 10) / 10 : 0,
        });
      } catch (e) {
        setStats(null);
      }
    };
    fetchStats();
  }, []);

  // Lọc user theo search
  const filteredUsers = topUsers.filter(u => {
    const keyword = search.toLowerCase();
    return (
      (u.displayName && u.displayName.toLowerCase().includes(keyword)) ||
      (u.userId && u.userId.toLowerCase().includes(keyword))
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">Bảng Xếp Hạng</h1>
        {/* Bộ lọc thời gian và tìm kiếm */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
          <div className="flex gap-2 items-center">
            <label className="font-medium text-gray-700">Thời gian:</label>
            <select
              className="border rounded p-2"
              value={timeFilter}
              onChange={e => setTimeFilter(e.target.value as any)}
            >
              <option value="all">Tất cả</option>
              <option value="week">Tuần này</option>
              <option value="month">Tháng này</option>
            </select>
          </div>
          <input
            className="border rounded p-2 w-full md:w-64"
            placeholder="Tìm kiếm người chơi..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {/* Thống kê tổng thể */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-700">{stats ? stats.totalUsers : '--'}</div>
            <div className="text-gray-600 text-sm">Người chơi</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-700">{stats ? stats.totalQuizzes : '--'}</div>
            <div className="text-gray-600 text-sm">Quiz</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-yellow-700">{stats ? stats.totalAttempts : '--'}</div>
            <div className="text-gray-600 text-sm">Lượt chơi</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-700">{stats ? stats.averageScore : '--'}%</div>
            <div className="text-gray-600 text-sm">Điểm TB</div>
          </div>
        </div>
        {/* Top Users */}
        <div className="mb-10">
          <h2 className="text-xl font-semibold mb-4 text-center">Top Người Chơi</h2>
          <div className="bg-white rounded-2xl shadow-lg p-6">
            {loading ? (
              <div className="flex gap-2">
                {Array.from({length: 3}).map((_,i) => (
                  <div key={i} className="animate-pulse bg-gray-100 rounded-full h-20 w-20 mx-auto" />
                ))}
                {Array.from({length: 7}).map((_,i) => (
                  <div key={i} className="animate-pulse bg-gray-100 rounded-lg h-10 w-full mt-2" />
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center text-gray-500">Không tìm thấy người chơi phù hợp.</div>
            ) : (
              <>
                {/* Top 3 nổi bật */}
                <div className="flex justify-center items-end gap-4 mb-8">
                  {filteredUsers.slice(0,3).map((u, idx) => (
                    <div key={u.userId} className={`flex flex-col items-center ${idx === 0 ? 'z-10' : 'z-0'}`}
                      style={{ transform: idx === 0 ? 'scale(1.15)' : 'scale(1)' }}>
                      <div className={`relative mb-2 ${idx === 0 ? 'shadow-2xl' : 'shadow-lg'}`}
                        style={{ width: 80, height: 80 }}>
                        <FaUserCircle className={`w-full h-full ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-gray-400' : 'text-orange-400'}`} />
                        <FaCrown className={`absolute -top-4 left-1/2 -translate-x-1/2 text-3xl ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-gray-400' : 'text-orange-400'}`} />
                      </div>
                      <div className={`font-bold text-lg ${idx === 0 ? 'text-yellow-600' : idx === 1 ? 'text-gray-600' : 'text-orange-600'}`}>{u.displayName || u.userId}</div>
                      <div className="text-sm text-gray-500">{u.totalScore} điểm</div>
                      <div className="text-xs text-gray-400">{u.totalAttempts} lần chơi</div>
                      <div className="mt-1 font-bold text-xl">#{idx+1}</div>
                    </div>
                  ))}
                </div>
                {/* Top 4+ */}
                <div className="overflow-x-auto">
                  <ol className="divide-y divide-gray-100">
                    {(showAllUsers ? filteredUsers.slice(3) : filteredUsers.slice(3,10)).map((u, idx) => (
                      <li key={u.userId} className="flex items-center gap-3 py-2">
                        <span className="font-bold text-blue-600">#{idx+4}</span>
                        <FaUserCircle className="w-8 h-8 text-blue-300" />
                        <span className="font-semibold truncate max-w-[120px]">{u.displayName || u.userId}</span>
                        <span className="ml-auto text-gray-500 font-medium">{u.totalScore} điểm</span>
                        <span className="ml-4 text-xs text-gray-400">{u.totalAttempts} lần chơi</span>
                      </li>
                    ))}
                  </ol>
                  
                  {/* Show More Button */}
                  {filteredUsers.length > 10 && (
                    <div className="text-center mt-4">
                      <button
                        onClick={() => setShowAllUsers(!showAllUsers)}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        {showAllUsers ? `Thu gọn (hiển thị ${filteredUsers.length} người)` : `Xem thêm ${filteredUsers.length - 10} người`}
                      </button>
                    </div>
                  )}
                </div>
                {/* Hiển thị vị trí user hiện tại nếu không nằm trong top 10 */}
                {user && filteredUsers.findIndex(u => u.userId === user.uid) === -1 && (
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg flex items-center gap-3">
                    <span className="font-bold text-blue-700">--</span>
                    <FaUserCircle className="w-8 h-8 text-blue-400" />
                    <span className="font-semibold truncate max-w-[120px]">{user.displayName || user.email || user.uid}</span>
                    <span className="ml-auto text-gray-500 font-medium">(Không nằm trong top 10)</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        {/* Top Quizzes */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-center flex-1">Top Quiz Được Chơi Nhiều</h2>
            {topQuizzes.length > 10 && (
              <button
                onClick={() => setShowAllQuizzes(!showAllQuizzes)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                {showAllQuizzes ? 'Thu gọn' : `Xem tất cả (${topQuizzes.length})`}
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              Array.from({length: 6}).map((_,i) => (
                <div key={i} className="animate-pulse bg-white rounded-xl shadow-lg h-24" />
              ))
            ) : topQuizzes.length === 0 ? (
              <div className="text-center text-gray-500 col-span-full">Chưa có dữ liệu quiz.</div>
            ) : (
              (showAllQuizzes ? topQuizzes : topQuizzes.slice(0, 12)).map(q => <QuizCard key={q.id} quiz={q} />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardPage;