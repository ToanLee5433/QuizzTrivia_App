import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { Database, Loader, CheckCircle, AlertCircle, RefreshCw, Calculator, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { collection, getDocs, doc, updateDoc, query, where, deleteDoc } from 'firebase/firestore';
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
  const [cleaningOrphans, setCleaningOrphans] = useState(false);
  const [orphansCleaned, setOrphansCleaned] = useState(false);
  const [orphanStats, setOrphanStats] = useState<{deleted: number, quizIds: string[]}>({deleted: 0, quizIds: []});
  
  // 🔄 Category deduplication states
  const [deduplicating, setDeduplicating] = useState(false);
  const [deduplicationDone, setDeduplicationDone] = useState(false);
  const [categoryStats, setCategoryStats] = useState<{
    total: number;
    unique: number;
    duplicatesDeleted: number;
    quizzesUpdated: number;
    details: {name: string; count: number; kept: string; deleted: string[]}[];
  }>({total: 0, unique: 0, duplicatesDeleted: 0, quizzesUpdated: 0, details: []});
  
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

  // 🗑️ Clean orphaned quiz results (results from deleted quizzes)
  const handleCleanOrphanedResults = async () => {
    try {
      setCleaningOrphans(true);
      setOrphanStats({deleted: 0, quizIds: []});
      toast.info('🔍 Đang quét tìm kết quả quiz mồ côi...');

      // Step 1: Get all approved quizzes
      const quizzesQuery = query(
        collection(db, 'quizzes'),
        where('status', '==', 'approved')
      );
      const quizzesSnapshot = await getDocs(quizzesQuery);
      
      // Build set of valid quiz IDs
      const validQuizIds = new Set<string>();
      quizzesSnapshot.forEach(doc => validQuizIds.add(doc.id));
      
      console.log(`📊 Found ${validQuizIds.size} approved quizzes`);

      // Step 2: Get all quiz results
      const resultsSnapshot = await getDocs(collection(db, 'quizResults'));
      console.log(`📊 Found ${resultsSnapshot.size} total quiz results`);

      // Step 3: Find and delete orphaned results
      const orphanedQuizIds = new Set<string>();
      let deletedCount = 0;
      const deletePromises: Promise<void>[] = [];

      resultsSnapshot.forEach(resultDoc => {
        const result = resultDoc.data();
        const quizId = result.quizId;
        
        // If quiz doesn't exist in approved quizzes, it's orphaned
        if (!validQuizIds.has(quizId)) {
          orphanedQuizIds.add(quizId);
          deletePromises.push(
            deleteDoc(doc(db, 'quizResults', resultDoc.id))
              .then(() => {
                deletedCount++;
                console.log(`🗑️ Deleted orphaned result: ${resultDoc.id} (quiz: ${quizId})`);
              })
              .catch(err => {
                console.error(`❌ Failed to delete ${resultDoc.id}:`, err);
              })
          );
        }
      });

      // Execute all deletes
      if (deletePromises.length > 0) {
        await Promise.all(deletePromises);
        
        setOrphanStats({
          deleted: deletedCount,
          quizIds: Array.from(orphanedQuizIds)
        });
        
        toast.success(`✅ Đã xóa ${deletedCount} kết quả quiz mồ côi từ ${orphanedQuizIds.size} quiz đã xóa!`);
        console.log(`✅ Cleaned ${deletedCount} orphaned results from ${orphanedQuizIds.size} deleted quizzes`);
      } else {
        toast.success('✅ Không có kết quả quiz mồ côi nào!');
        console.log('✅ No orphaned results found');
      }

      setOrphansCleaned(true);

    } catch (error) {
      console.error('❌ Error cleaning orphaned results:', error);
      toast.error('❌ Có lỗi khi xóa: ' + (error as Error).message);
    } finally {
      setCleaningOrphans(false);
    }
  };

  // 🔄 Deduplicate Categories - Remove duplicate categories and update quizzes
  const handleDeduplicateCategories = async () => {
    try {
      setDeduplicating(true);
      setCategoryStats({total: 0, unique: 0, duplicatesDeleted: 0, quizzesUpdated: 0, details: []});
      toast.info('🔍 Đang quét categories và tìm trùng lặp...');

      // Step 1: Get all categories
      const categoriesSnapshot = await getDocs(collection(db, 'categories'));
      const categories: {id: string; name: string; createdAt?: Date; updatedAt?: Date}[] = [];
      
      categoriesSnapshot.forEach(docSnap => {
        const data = docSnap.data();
        categories.push({
          id: docSnap.id,
          name: data.name,
          createdAt: data.createdAt?.toDate?.() || new Date(0),
          updatedAt: data.updatedAt?.toDate?.() || new Date(0)
        });
      });

      console.log(`📊 Tìm thấy ${categories.length} categories tổng cộng`);

      // Step 2: Group categories by name (case-insensitive trim)
      const categoryGroups = new Map<string, typeof categories>();
      
      categories.forEach(cat => {
        const normalizedName = cat.name.trim().toLowerCase();
        if (!categoryGroups.has(normalizedName)) {
          categoryGroups.set(normalizedName, []);
        }
        categoryGroups.get(normalizedName)!.push(cat);
      });

      console.log(`📊 Có ${categoryGroups.size} unique category names`);

      // Step 3: Process duplicates - keep oldest (first created) or most recently updated
      const keepIds = new Set<string>();
      const deleteIds: string[] = [];
      const idMapping = new Map<string, string>(); // old ID -> new ID (kept ID)
      const details: {name: string; count: number; kept: string; deleted: string[]}[] = [];

      categoryGroups.forEach((group, _normalizedName) => {
        if (group.length > 1) {
          // Sort by createdAt (oldest first) - keep the oldest one
          group.sort((a, b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0));
          
          const kept = group[0]; // Keep oldest
          keepIds.add(kept.id);
          
          const deletedIds: string[] = [];
          for (let i = 1; i < group.length; i++) {
            deleteIds.push(group[i].id);
            deletedIds.push(group[i].id);
            idMapping.set(group[i].id, kept.id);
          }
          
          details.push({
            name: kept.name,
            count: group.length,
            kept: kept.id,
            deleted: deletedIds
          });
          
          console.log(`🔄 "${kept.name}": ${group.length} bản, giữ ${kept.id}, xóa ${deletedIds.join(', ')}`);
        } else {
          keepIds.add(group[0].id);
        }
      });

      // Step 4: Update quizzes that reference deleted categories
      let quizzesUpdated = 0;
      
      if (deleteIds.length > 0) {
        const quizzesSnapshot = await getDocs(collection(db, 'quizzes'));
        const updatePromises: Promise<void>[] = [];

        quizzesSnapshot.forEach(quizDoc => {
          const quizData = quizDoc.data();
          const categoryId = quizData.category || quizData.categoryId;
          
          if (categoryId && idMapping.has(categoryId)) {
            const newCategoryId = idMapping.get(categoryId)!;
            updatePromises.push(
              updateDoc(doc(db, 'quizzes', quizDoc.id), {
                category: newCategoryId,
                categoryId: newCategoryId
              }).then(() => {
                quizzesUpdated++;
                console.log(`✅ Quiz "${quizData.title}" updated: ${categoryId} → ${newCategoryId}`);
              })
            );
          }
        });

        if (updatePromises.length > 0) {
          await Promise.all(updatePromises);
          console.log(`✅ Đã cập nhật ${quizzesUpdated} quizzes`);
        }

        // Step 5: Delete duplicate categories
        const deletePromises = deleteIds.map(id =>
          deleteDoc(doc(db, 'categories', id)).then(() => {
            console.log(`🗑️ Đã xóa category trùng: ${id}`);
          })
        );

        await Promise.all(deletePromises);
        console.log(`✅ Đã xóa ${deleteIds.length} categories trùng lặp`);
      }

      // Update stats
      setCategoryStats({
        total: categories.length,
        unique: categoryGroups.size,
        duplicatesDeleted: deleteIds.length,
        quizzesUpdated: quizzesUpdated,
        details: details
      });

      if (deleteIds.length > 0) {
        toast.success(`✅ Đã gộp ${details.length} nhóm categories trùng, xóa ${deleteIds.length} bản sao, cập nhật ${quizzesUpdated} quizzes!`);
      } else {
        toast.success('✅ Không có categories trùng lặp!');
      }

      setDeduplicationDone(true);

    } catch (error) {
      console.error('❌ Error deduplicating categories:', error);
      toast.error('❌ Có lỗi khi xử lý: ' + (error as Error).message);
    } finally {
      setDeduplicating(false);
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

        {/* Clean Orphaned Quiz Results */}
        <div className="border border-red-200 rounded-lg p-4 bg-red-50">
          <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-600" />
            Dọn dẹp kết quả quiz mồ côi
          </h3>
          <p className="text-gray-600 mb-4">
            Xóa các kết quả quiz thuộc về những quiz đã bị xóa khỏi hệ thống. 
            Giúp tiết kiệm dung lượng database và giữ dữ liệu sạch sẽ.
          </p>
          
          <button
            onClick={handleCleanOrphanedResults}
            disabled={cleaningOrphans}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              cleaningOrphans
                ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            {cleaningOrphans ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Đang quét và xóa...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Quét & Xóa kết quả mồ côi
              </>
            )}
          </button>

          {orphansCleaned && orphanStats.deleted > 0 && (
            <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded-lg">
              <p className="text-green-800 font-medium">
                ✅ Đã xóa {orphanStats.deleted} kết quả từ {orphanStats.quizIds.length} quiz đã xóa
              </p>
              <p className="text-green-700 text-sm mt-1">
                Quiz IDs: {orphanStats.quizIds.slice(0, 5).join(', ')}
                {orphanStats.quizIds.length > 5 && ` và ${orphanStats.quizIds.length - 5} quiz khác`}
              </p>
            </div>
          )}

          {orphansCleaned && orphanStats.deleted === 0 && (
            <div className="mt-4 p-3 bg-blue-100 border border-blue-300 rounded-lg">
              <p className="text-blue-800 font-medium">
                ✅ Không có kết quả mồ côi nào cần xóa!
              </p>
            </div>
          )}
        </div>

        {/* Deduplicate Categories */}
        <div className="border border-orange-200 rounded-lg p-4 bg-orange-50">
          <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-orange-600" />
            🔄 Gộp Categories trùng lặp
          </h3>
          <p className="text-gray-600 mb-4">
            Quét tất cả categories, tìm và gộp các bản trùng lặp (cùng tên). 
            Giữ lại bản cũ nhất, cập nhật tất cả quizzes về đúng category, 
            rồi xóa các bản sao.
          </p>
          
          <button
            onClick={handleDeduplicateCategories}
            disabled={deduplicating}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              deduplicating
                ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                : 'bg-orange-600 text-white hover:bg-orange-700'
            }`}
          >
            {deduplicating ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Đang quét và gộp...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Quét & Gộp Categories
              </>
            )}
          </button>

          {deduplicationDone && (
            <div className="mt-4 space-y-3">
              {/* Summary Stats */}
              <div className={`p-3 rounded-lg border ${
                categoryStats.duplicatesDeleted > 0 
                  ? 'bg-green-100 border-green-300' 
                  : 'bg-blue-100 border-blue-300'
              }`}>
                <p className={`font-medium ${
                  categoryStats.duplicatesDeleted > 0 
                    ? 'text-green-800' 
                    : 'text-blue-800'
                }`}>
                  {categoryStats.duplicatesDeleted > 0 ? (
                    <>
                      ✅ Kết quả: {categoryStats.total} categories → {categoryStats.unique} unique
                      <br />
                      📦 Đã xóa {categoryStats.duplicatesDeleted} bản sao
                      <br />
                      📝 Đã cập nhật {categoryStats.quizzesUpdated} quizzes
                    </>
                  ) : (
                    '✅ Không có categories trùng lặp!'
                  )}
                </p>
              </div>

              {/* Detail per duplicate group */}
              {categoryStats.details.length > 0 && (
                <div className="bg-white border border-orange-200 rounded-lg p-3">
                  <p className="font-medium text-gray-800 mb-2">📋 Chi tiết các nhóm trùng lặp:</p>
                  <div className="space-y-2 text-sm">
                    {categoryStats.details.map((detail, idx) => (
                      <div key={idx} className="bg-orange-50 p-2 rounded">
                        <span className="font-medium text-orange-800">"{detail.name}"</span>
                        <span className="text-gray-600"> - {detail.count} bản</span>
                        <br />
                        <span className="text-green-700">✓ Giữ: {detail.kept.substring(0, 8)}...</span>
                        <br />
                        <span className="text-red-600">✗ Xóa: {detail.deleted.map(d => d.substring(0, 8) + '...').join(', ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminUtilities;
