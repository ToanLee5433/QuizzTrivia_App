import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Users, 
  Play, 
  Settings
} from 'lucide-react';

const MultiplayerTestComponent: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">🎮 Multiplayer Quiz</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
            <Users className="w-12 h-12 text-blue-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">{t('multiplayer.joinRoom')}</h3>
            <p className="text-white/70 mb-4">{t('multiplayer.joinRoomDesc')}</p>
            <button
              onClick={() => navigate('/multiplayer')}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Xem phòng
            </button>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
            <Play className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">{t('multiplayer.createRoom')}</h3>
            <p className="text-white/70 mb-4">{t('multiplayer.createRoomDesc')}</p>
            <button
              onClick={() => navigate('/multiplayer/create')}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >{t("gameMode.createRoom")}
            </button>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
            <Settings className="w-12 h-12 text-purple-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">{t('common.guide')}</h3>
            <p className="text-white/70 mb-4">{t('multiplayer.guideDesc')}</p>
            <button
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              onClick={() => alert('Hướng dẫn multiplayer:\n1. Tạo hoặc tham gia phòng\n2. Chờ host bắt đầu\n3. Trả lời câu hỏi nhanh để được điểm cao\n4. Xem kết quả cuối game')}
            >
              Xem hướng dẫn
            </button>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8">
          <h2 className="text-2xl font-bold text-white mb-4">{t('multiplayer.features')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <div className="text-white/80">
              <h4 className="font-bold mb-2">🎯 Real-time Gaming</h4>
              <p className="text-sm">{t('multiplayer.realTimeDesc')}</p>
            </div>
            <div className="text-white/80">
              <h4 className="font-bold mb-2">🏆 Leaderboard</h4>
              <p className="text-sm">{t('multiplayer.leaderboardDesc')}</p>
            </div>
            <div className="text-white/80">
              <h4 className="font-bold mb-2">⚡ Quick Scoring</h4>
              <p className="text-sm">{t('multiplayer.quickScoringDesc')}</p>
            </div>
            <div className="text-white/80">
              <h4 className="font-bold mb-2">🎮 Easy Setup</h4>
              <p className="text-sm">{t('multiplayer.easySetupDesc')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiplayerTestComponent;