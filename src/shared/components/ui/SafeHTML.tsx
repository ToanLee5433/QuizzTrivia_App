import React from 'react';
import { renderSafeHTML, stripHTML } from '../../../utils/htmlUtils';

interface SafeHTMLProps {
  content: string | undefined | null;
  className?: string;
  as?: 'div' | 'p' | 'span';
  /** If true, strips all HTML and renders as plain text (useful for truncated displays) */
  plainText?: boolean;
}

/**
 * Component render HTML safely
 * Tự động sanitize và handle cả HTML & plain text
 * 
 * Usage:
 *   <SafeHTML content={quiz.description} className="text-gray-600" />
 *   <SafeHTML content={question.explanation} as="span" />
 *   <SafeHTML content={quiz.description} plainText className="line-clamp-2" />
 */
const SafeHTML: React.FC<SafeHTMLProps> = ({ 
  content, 
  className = '', 
  as: Component = 'div',
  plainText = false
}) => {
  if (!content) return null;
  
  // If plainText mode, strip all HTML and render as text
  if (plainText) {
    return (
      <Component className={className}>
        {stripHTML(content)}
      </Component>
    );
  }
  
  return (
    <Component 
      className={`rich-text-content ${className}`}
      dangerouslySetInnerHTML={renderSafeHTML(content)}
    />
  );
};

export default SafeHTML;
