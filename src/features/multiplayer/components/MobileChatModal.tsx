import React from 'react';
import RealtimeChat from './RealtimeChat';

interface MobileChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  currentUserId: string;
  currentUsername: string;
}

const MobileChatModal: React.FC<MobileChatModalProps> = ({
  isOpen,
  onClose,
  roomId,
  currentUserId,
  currentUsername
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <RealtimeChat
        roomId={roomId}
        currentUserId={currentUserId}
        currentUsername={currentUsername}
        isMobile={true}
        onClose={onClose}
      />
    </div>
  );
};

export default MobileChatModal;
