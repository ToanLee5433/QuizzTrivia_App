import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content để ngăn XSS attacks
 */
export const sanitizeHTML = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'blockquote', 'code', 'pre',
      'a', 'img', 'span', 'div'
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'style', 'target', 'rel']
  });
};

/**
 * Convert HTML entities về dạng text thuần (cho export CSV/plain text)
 */
export const htmlToPlainText = (html: string): string => {
  const temp = document.createElement('div');
  temp.innerHTML = html;
  return temp.textContent || temp.innerText || '';
};

/**
 * Check xem content có phải HTML không
 */
export const isHTML = (str: string): boolean => {
  const htmlPattern = /<\/?[a-z][\s\S]*>/i;
  return htmlPattern.test(str);
};

/**
 * Normalize line breaks - convert \n thành <br> nếu không phải HTML
 */
export const normalizeLineBreaks = (text: string): string => {
  if (isHTML(text)) return text;
  return text.replace(/\n/g, '<br>');
};

/**
 * Strip all HTML tags (cho plain text output)
 */
export const stripHTML = (html: string): string => {
  return html.replace(/<[^>]*>/g, '');
};

/**
 * Render safe HTML content - main utility function
 * Tự động detect HTML và xử lý phù hợp
 */
export const renderSafeHTML = (content: string | undefined | null): { 
  __html: string 
} => {
  if (!content) return { __html: '' };
  
  // Nếu đã là HTML, sanitize và return
  if (isHTML(content)) {
    return { __html: sanitizeHTML(content) };
  }
  
  // Nếu là plain text, convert line breaks và return
  return { __html: sanitizeHTML(normalizeLineBreaks(content)) };
};
