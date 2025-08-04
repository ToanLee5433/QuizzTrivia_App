import React from 'react';
import DOMPurify from 'dompurify';

interface RichTextViewerProps {
  content: string;
  className?: string;
}

const RichTextViewer: React.FC<RichTextViewerProps> = ({ 
  content, 
  className = '' 
}) => {
  // Sanitize HTML content to prevent XSS attacks
  const sanitizedContent = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'sub', 'sup',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'blockquote', 'pre', 'code',
      'a', 'img', 'video',
      'div', 'span'
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel',
      'src', 'alt', 'width', 'height',
      'style', 'class',
      'controls', 'autoplay', 'loop', 'muted'
    ],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
  });

  return (
    <div 
      className={`prose prose-sm max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
      style={{
        // Custom styles for rich text content
        lineHeight: '1.6',
      }}
    />
  );
};

export default RichTextViewer;
