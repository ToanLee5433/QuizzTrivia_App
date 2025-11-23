import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { Database, Loader, CheckCircle, AlertCircle, RefreshCw, Calculator } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase/config';

interface FixIssue {
  quizId: string;
  title: string;
  issue: string;
  fix: string;
}

const AdminUtilities: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(false);
  const [fixingStats, setFixingStats] = useState(false);
  const [statsFixed, setStatsFixed] = useState(false);
  const [statsIssues, setStatsIssues] = useState<FixIssue[]>([]);
  const [recalculating, setRecalculating] = useState(false);
  const [recalculated, setRecalculated] = useState(false);
  const [recalcResults, setRecalcResults] = useState<FixIssue[]>([]);
  const { t } = useTranslation();

  const handleCreateTestQuizzes = async () => {
    if (created) {
      toast.warning(t('admin.utilities.createTestQuizzes.alreadyCreated'));
      return;
    }

    try {
      setLoading(true);
      // TODO: Implement createTestQuizzes function if needed
      console.log('Creating test quizzes...');
      setCreated(true);
      toast.success(t('admin.utilities.createTestQuizzes.success'));
    } catch (error) {
      console.error('Error creating test quizzes:', error);
      toast.error(t('admin.utilities.createTestQuizzes.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculateStats = async () => {
    try {
      setRecalculating(true);
      setRecalcResults([]);
      toast.info('🔄 Đang tính lại stats từ quizResults thực tế...');

      const quizzesRef = collection(db, 'quizzes');
      const quizSnapshot = await getDocs(quizzesRef);

      let recalcCount = 0;
      const results: FixIssue[] = [];

      for (const quizDoc of quizSnapshot.docs) {
        const quizData = quizDoc.data();
        
        // Get all results for this quiz
        const resultsRef = collection(db, 'quizResults');
        const resultsQuery = query(resultsRef, where('quizId', '==', quizDoc.id));
        const resultsSnapshot = await getDocs(resultsQuery);
        
        if (resultsSnapshot.empty) continue;

        // Calculate actual stats from results
        let totalScore = 0;
        let completedCount = 0;
        
        resultsSnapshot.docs.forEach(resultDoc => {
          const result = resultDoc.data();
          const score = result.score || 0;
          totalScore += score;
          if (score >= 50) completedCount++;
        });

        const completions = resultsSnapshot.size;
        const calculatedAverage = Math.round(totalScore / completions);
        const calculatedRate = Math.round((completedCount / completions) * 100);

        const currentAvg = quizData.stats?.averageScore || 0;
        const currentRate = quizData.stats?.completionRate || 0;

        // Update if different
        if (Math.abs(calculatedAverage - currentAvg) > 1 || Math.abs(calculatedRate - currentRate) > 1) {
          await updateDoc(doc(db, 'quizzes', quizDoc.id), {
            'stats.completions': completions,
            'stats.completedCount': completedCount,
            'stats.totalScore': totalScore,
            'stats.averageScore': calculatedAverage,
            'stats.completionRate': calculatedRate
          });

          recalcCount++;
          results.push({
            quizId: quizDoc.id,
            title: quizData.title || 'Untitled',
            issue: `Avg: ${currentAvg}% → ${calculatedAverage}%, Rate: ${currentRate}% → ${calculatedRate}%`,
            fix: `Đã cập nhật từ ${completions} results thực tế`
          });
        }
      }

      setRecalcResults(results);
      setRecalculated(true);

      if (results.length > 0) {
        toast.success(`✅ Đã tính lại ${recalcCount} quiz!`);
      } else {
        toast.success('✅ Tất cả stats đã chính xác!');
      }

    } catch (error) {
      console.error('❌ Error recalculating stats:', error);
      toast.error('❌ Có lỗi: ' + (error as Error).message);
    } finally {
      setRecalculating(false);
    }
  };

  const handleFixQuizStats = async () => {
    try {
      setFixingStats(true);
      setStatsIssues([]);
      toast.info('🔧 Đang kiểm tra và sửa stats của các quiz...');

      const quizzesRef = collection(db, 'quizzes');
      const snapshot = await getDocs(quizzesRef);

      let fixedCount = 0;
      let skippedCount = 0;
      const issues: FixIssue[] = [];

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const stats = data.stats || {};
        
        const averageScore = stats.averageScore || 0;
        const completionRate = stats.completionRate || 0;
        const totalScore = stats.totalScore || 0;
        const completions = stats.completions || 0;
        const completedCount = stats.completedCount || 0;

        let needsFix = false;
        const updates: any = {};

        // Fix 1: averageScore > 100 or < 0
        if (averageScore > 100 || averageScore < 0) {
          needsFix = true;
          const correctAverage = completions > 0 
            ? Math.min(100, Math.max(0, Math.round(totalScore / completions)))
            : 0;
          updates['stats.averageScore'] = correctAverage;
          
          issues.push({
            quizId: docSnap.id,
            title: data.title || 'Untitled',
            issue: `averageScore = ${averageScore}% (không hợp lệ)`,
            fix: `Đã sửa thành ${correctAverage}%`
          });
        }

        // Fix 2: completionRate > 100 or < 0
        if (completionRate > 100 || completionRate < 0) {
          needsFix = true;
          const correctRate = completions > 0
            ? Math.min(100, Math.max(0, Math.round((completedCount / completions) * 100)))
            : 0;
          updates['stats.completionRate'] = correctRate;
          
          issues.push({
            quizId: docSnap.id,
            title: data.title || 'Untitled',
            issue: `completionRate = ${completionRate}% (không hợp lệ)`,
            fix: `Đã sửa thành ${correctRate}%`
          });
        }

        // Fix 3: totalScore seems unreasonably high
        if (totalScore > completions * 100) {
          needsFix = true;
          const maxTotalScore = completions * 100;
          updates['stats.totalScore'] = maxTotalScore;
          updates['stats.averageScore'] = completions > 0 
            ? Math.round(maxTotalScore / completions) 
            : 0;
          
          issues.push({
            quizId: docSnap.id,
            title: data.title || 'Untitled',
            issue: `totalScore = ${totalScore} (vượt quá max ${maxTotalScore})`,
            fix: `Đã giới hạn về ${maxTotalScore}`
          });
        }

        // Fix 4: NaN or invalid values
        if (!isFinite(averageScore) || isNaN(averageScore)) {
          needsFix = true;
          const correctAverage = completions > 0 && totalScore > 0
            ? Math.min(100, Math.max(0, Math.round(totalScore / completions)))
            : 0;
          updates['stats.averageScore'] = correctAverage;
          
          issues.push({
            quizId: docSnap.id,
            title: data.title || 'Untitled',
            issue: `averageScore = NaN hoặc Infinity`,
            fix: `Đã sửa thành ${correctAverage}%`
          });
        }

        if (!isFinite(completionRate) || isNaN(completionRate)) {
          needsFix = true;
          const correctRate = completions > 0
            ? Math.min(100, Math.max(0, Math.round((completedCount / completions) * 100)))
            : 0;
          updates['stats.completionRate'] = correctRate;
          
          issues.push({
            quizId: docSnap.id,
            title: data.title || 'Untitled',
            issue: `completionRate = NaN hoặc Infinity`,
            fix: `Đã sửa thành ${correctRate}%`
          });
        }

        if (needsFix) {
          await updateDoc(doc(db, 'quizzes', docSnap.id), updates);
          fixedCount++;
        } else {
          skippedCount++;
        }
      }

      setStatsIssues(issues);
      setStatsFixed(true);

      console.log('✅ Migration complete!');
      console.log(`📊 Fixed: ${fixedCount}, Skipped: ${skippedCount}, Total: ${snapshot.size}`);

      if (issues.length > 0) {
        toast.success(`✅ Đã sửa ${fixedCount} quiz có lỗi stats!`);
      } else {
        toast.success('✅ Tất cả quiz đều có stats hợp lệ!');
      }

    } catch (error) {
      console.error('❌ Error fixing quiz stats:', error);
      toast.error('❌ Có lỗi khi sửa stats: ' + (error as Error).message);
    } finally {
      setFixingStats(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <Database className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-bold text-gray-900">{t('admin.utilities.title')}</h2>
      </div>

      <div className="space-y-4">
        {/* Recalculate Stats from Real Data */}
        <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
          <div className="flex items-start gap-3 mb-2">
            <Calculator className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">🔄 Tính Lại Stats Từ Dữ Liệu Thực</h3>
              <p className="text-gray-700 text-sm mb-3">
                Tính lại averageScore và completionRate từ quizResults thực tế thay vì tin vào stats đã lưu (có thể bị lỗi do race condition).
                <br />
                <span className="text-blue-700 font-medium">💡 Dùng tool này để fix các quiz hiển thị 100% sai</span>
              </p>
              
              <button
                onClick={handleRecalculateStats}
                disabled={recalculating}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  recalculating
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {recalculating ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Đang tính toán...
                  </>
                ) : (
                  <>
                    <Calculator className="w-4 h-4" />
                    Tính Lại Ngay
                  </>
                )}
              </button>

              {recalculated && recalcResults.length > 0 && (
                <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-sm text-gray-900 mb-2">
                    📊 Đã cập nhật {recalcResults.length} quiz:
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {recalcResults.map((result, idx) => (
                      <div key={idx} className="text-xs border-l-2 border-blue-400 pl-2 py-1">
                        <div className="font-medium text-gray-900">{result.title}</div>
                        <div className="text-gray-600">🔄 {result.issue}</div>
                        <div className="text-green-600">✅ {result.fix}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {recalculated && recalcResults.length === 0 && (
                <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                  ✅ Tất cả stats đã chính xác!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Fix Quiz Stats */}
        <div className="border border-orange-200 rounded-lg p-4 bg-orange-50">
          <div className="flex items-start gap-3 mb-2">
            <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">🔧 Sửa Quiz Stats (500% Bug)</h3>
              <p className="text-gray-700 text-sm mb-3">
                Sửa lỗi stats không hợp lệ (averageScore, completionRate &gt; 100%). 
                <br />
                <span className="text-orange-700 font-medium">⚠️ Lỗi này làm "Điểm TB" hiển thị 500% thay vì giá trị hợp lệ 0-100%</span>
              </p>
              
              <button
                onClick={handleFixQuizStats}
                disabled={fixingStats}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  fixingStats
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                    : 'bg-orange-600 text-white hover:bg-orange-700'
                }`}
              >
                {fixingStats ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Đang sửa stats...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Sửa Stats Ngay
                  </>
                )}
              </button>

              {statsFixed && statsIssues.length > 0 && (
                <div className="mt-4 p-3 bg-white rounded-lg border border-orange-200">
                  <h4 className="font-semibold text-sm text-gray-900 mb-2">
                    🔍 Đã sửa {statsIssues.length} quiz:
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {statsIssues.map((issue, idx) => (
                      <div key={idx} className="text-xs border-l-2 border-orange-400 pl-2 py-1">
                        <div className="font-medium text-gray-900">{issue.title}</div>
                        <div className="text-red-600">❌ {issue.issue}</div>
                        <div className="text-green-600">✅ {issue.fix}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {statsFixed && statsIssues.length === 0 && (
                <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                  ✅ Tất cả quiz đều có stats hợp lệ!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Create Test Quizzes */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2">{t('admin.utilities.createTestQuizzes.title')}</h3>
          <p className="text-gray-600 mb-4">
            {t('admin.utilities.createTestQuizzes.desc')}
          </p>
          
          <button
            onClick={handleCreateTestQuizzes}
            disabled={loading || created}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              created
                ? 'bg-green-100 text-green-800 cursor-not-allowed'
                : loading
                ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                {t('admin.utilities.createTestQuizzes.creating')}
              </>
            ) : created ? (
              <>
                <CheckCircle className="w-4 h-4" />
                {t('admin.utilities.createTestQuizzes.created')}
              </>
            ) : (
              <>
                <Database className="w-4 h-4" />
                {t('admin.utilities.createTestQuizzes.button')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminUtilities;
