import React from 'react';
import { X } from 'lucide-react';
import MultiplayerChat from './MultiplayerChat';

interface MobileChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: any[];
  currentUserId: string;
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

const MobileChatModal: React.FC<MobileChatModalProps> = ({
  isOpen,
  onClose,
  messages,
  currentUserId,
  onSendMessage,
  disabled = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 lg:hidden">
      <div className="absolute inset-0 flex flex-col bg-white">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <h2 className="text-lg font-bold">Chat</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Content */}
        <div className="flex-1 overflow-hidden">
          <MultiplayerChat
            messages={messages}
            currentUserId={currentUserId}
            onSendMessage={onSendMessage}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
};

export default MobileChatModal;
