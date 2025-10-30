import React from 'react';
import { renderSafeHTML } from '../../../utils/htmlUtils';

interface SafeHTMLProps {
  content: string | undefined | null;
  className?: string;
  as?: 'div' | 'p' | 'span';
}

/**
 * Component render HTML safely
 * Tự động sanitize và handle cả HTML & plain text
 * 
 * Usage:
 *   <SafeHTML content={quiz.description} className="text-gray-600" />
 *   <SafeHTML content={question.explanation} as="span" />
 */
const SafeHTML: React.FC<SafeHTMLProps> = ({ 
  content, 
  className = '', 
  as: Component = 'div' 
}) => {
  if (!content) return null;
  
  return (
    <Component 
      className={className}
      dangerouslySetInnerHTML={renderSafeHTML(content)}
    />
  );
};

export default SafeHTML;
