import React from 'react';
import { renderSafeHTML } from '../../../utils/htmlUtils';

interface RichTextViewerProps {
  content: string;
  className?: string;
}

const RichTextViewer: React.FC<RichTextViewerProps> = ({ 
  content, 
  className = '' 
}) => {
  return (
    <div 
      className={`prose prose-sm max-w-none ${className}`}
      dangerouslySetInnerHTML={renderSafeHTML(content)}
      style={{
        // Custom styles for rich text content
        lineHeight: '1.6',
      }}
    />
  );
};

export default RichTextViewer;
