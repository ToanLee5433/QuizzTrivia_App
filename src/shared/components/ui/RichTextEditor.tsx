import React, { useMemo, useCallback, useEffect, useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  height?: number;
  className?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Nhập nội dung...',
  readOnly = false,
  height = 300,
  className = ''
}) => {
  const quillRef = useRef<ReactQuill>(null);

  // Memoize the change handler to prevent unnecessary re-renders
  const handleChange = useCallback((content: string) => {
    onChange(content);
  }, [onChange]);

  // Fix: Ensure editor preserves whitespace after mount
  useEffect(() => {
    if (quillRef.current) {
      const editor = quillRef.current.getEditor();
      const editorElement = editor.root;
      
      // Force whitespace preservation
      editorElement.style.whiteSpace = 'pre-wrap';
      editorElement.style.wordWrap = 'break-word';
      editorElement.style.overflowWrap = 'break-word';
    }
  }, []);

  // Quill modules configuration - FULL FEATURES
  const modules = useMemo(() => ({
    toolbar: !readOnly ? {
      container: [
        // Headers
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        // Font & Size
        [{ 'font': [] }],
        [{ 'size': ['small', false, 'large', 'huge'] }],
        // Text formatting
        ['bold', 'italic', 'underline', 'strike'],
        // Colors
        [{ 'color': [] }, { 'background': [] }],
        // Subscript/Superscript
        [{ 'script': 'sub' }, { 'script': 'super' }],
        // Lists
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        // Indent
        [{ 'indent': '-1' }, { 'indent': '+1' }],
        // Text direction
        [{ 'direction': 'rtl' }],
        // Alignment
        [{ 'align': [] }],
        // Media
        ['link', 'image', 'video'],
        // Code blocks
        ['blockquote', 'code-block'],
        // Clear formatting
        ['clean']
      ],
      handlers: {}
    } : false,
    clipboard: {
      matchVisual: true,
    },
    keyboard: {
      bindings: {
        // Allow Tab for indentation
        tab: {
          key: 9,
          handler: function() {
            return true;
          }
        }
      }
    }
  }), [readOnly]);

  // Quill formats - FULL LIST
  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'script',
    'list', 'bullet', 'indent',
    'direction', 'align',
    'link', 'image', 'video',
    'blockquote', 'code-block',
    'clean'
  ];

  return (
    <div className={`rich-text-editor ${className}`}>
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value || ''}
        onChange={handleChange}
        placeholder={placeholder}
        readOnly={readOnly}
        modules={modules}
        formats={formats}
        preserveWhitespace={true}
        style={{
          height: `${height}px`,
          marginBottom: '50px'
        }}
      />
      {/* Inline styles to ensure they override Tailwind Preflight */}
      <style>{`
        /* CRITICAL: Override Tailwind Preflight reset for Quill */
        .rich-text-editor .ql-container {
          font-family: inherit !important;
          font-size: 14px !important;
        }
        
        .rich-text-editor .ql-editor {
          min-height: ${height - 80}px;
          font-family: inherit !important;
          font-size: 14px !important;
          line-height: 1.6 !important;
          white-space: pre-wrap !important;
          word-wrap: break-word !important;
          overflow-wrap: break-word !important;
          tab-size: 4 !important;
          -moz-tab-size: 4 !important;
        }
        
        /* Ensure paragraphs have proper spacing */
        .rich-text-editor .ql-editor p {
          margin: 0 0 0.5em 0 !important;
          padding: 0 !important;
          white-space: pre-wrap !important;
        }
        
        .rich-text-editor .ql-editor p:last-child {
          margin-bottom: 0 !important;
        }
        
        /* Lists */
        .rich-text-editor .ql-editor ol,
        .rich-text-editor .ql-editor ul {
          padding-left: 1.5em !important;
          margin: 0.5em 0 !important;
        }
        
        /* Headers */
        .rich-text-editor .ql-editor h1,
        .rich-text-editor .ql-editor h2,
        .rich-text-editor .ql-editor h3,
        .rich-text-editor .ql-editor h4,
        .rich-text-editor .ql-editor h5,
        .rich-text-editor .ql-editor h6 {
          margin: 0.5em 0 !important;
          font-weight: bold !important;
        }
        
        /* Blockquote */
        .rich-text-editor .ql-editor blockquote {
          border-left: 4px solid #ccc !important;
          margin: 0.5em 0 !important;
          padding-left: 1em !important;
        }
        
        /* Code block */
        .rich-text-editor .ql-editor pre.ql-syntax {
          background-color: #23241f !important;
          color: #f8f8f2 !important;
          padding: 1em !important;
          border-radius: 4px !important;
          overflow-x: auto !important;
          white-space: pre !important;
        }
        
        /* Toolbar styling */
        .rich-text-editor .ql-toolbar {
          border: 1px solid #e5e7eb !important;
          border-bottom: none !important;
          border-radius: 8px 8px 0 0 !important;
          background: white !important;
          padding: 8px !important;
        }
        
        .rich-text-editor .ql-container {
          border: 1px solid #e5e7eb !important;
          border-radius: 0 0 8px 8px !important;
          background: white !important;
        }
        
        .rich-text-editor .ql-editor:focus {
          outline: none !important;
        }
        
        .rich-text-editor .ql-editor.ql-blank::before {
          font-style: normal !important;
          color: #9ca3af !important;
        }
        
        /* Toolbar hover effects */
        .rich-text-editor .ql-toolbar button:hover,
        .rich-text-editor .ql-toolbar .ql-picker-label:hover {
          color: #3b82f6 !important;
        }
        
        .rich-text-editor .ql-toolbar button:hover .ql-stroke,
        .rich-text-editor .ql-toolbar .ql-picker-label:hover .ql-stroke {
          stroke: #3b82f6 !important;
        }
        
        .rich-text-editor .ql-toolbar button:hover .ql-fill,
        .rich-text-editor .ql-toolbar .ql-picker-label:hover .ql-fill {
          fill: #3b82f6 !important;
        }
        
        .rich-text-editor .ql-toolbar button.ql-active,
        .rich-text-editor .ql-toolbar .ql-picker-label.ql-active {
          color: #3b82f6 !important;
        }
        
        .rich-text-editor .ql-toolbar button.ql-active .ql-stroke {
          stroke: #3b82f6 !important;
        }
        
        .rich-text-editor .ql-toolbar button.ql-active .ql-fill {
          fill: #3b82f6 !important;
        }
        
        /* Dark mode styles */
        .dark .rich-text-editor .ql-toolbar {
          background: #1e293b !important;
          border-color: #475569 !important;
        }
        
        .dark .rich-text-editor .ql-container {
          background: #1e293b !important;
          border-color: #475569 !important;
        }
        
        .dark .rich-text-editor .ql-editor {
          color: #f1f5f9 !important;
        }
        
        .dark .rich-text-editor .ql-editor.ql-blank::before {
          color: #64748b !important;
        }
        
        .dark .rich-text-editor .ql-toolbar .ql-stroke {
          stroke: #94a3b8 !important;
        }
        
        .dark .rich-text-editor .ql-toolbar .ql-fill {
          fill: #94a3b8 !important;
        }
        
        .dark .rich-text-editor .ql-toolbar .ql-picker {
          color: #94a3b8 !important;
        }
        
        .dark .rich-text-editor .ql-toolbar .ql-picker-options {
          background: #1e293b !important;
          border-color: #475569 !important;
        }
        
        .dark .rich-text-editor .ql-toolbar .ql-picker-item {
          color: #94a3b8 !important;
        }
        
        .dark .rich-text-editor .ql-toolbar .ql-picker-item:hover,
        .dark .rich-text-editor .ql-toolbar button:hover {
          color: #3b82f6 !important;
        }
        
        .dark .rich-text-editor .ql-toolbar button:hover .ql-stroke {
          stroke: #3b82f6 !important;
        }
        
        .dark .rich-text-editor .ql-toolbar button:hover .ql-fill {
          fill: #3b82f6 !important;
        }
        
        .dark .rich-text-editor .ql-editor pre.ql-syntax {
          background-color: #0f172a !important;
        }
        
        .dark .rich-text-editor .ql-editor blockquote {
          border-left-color: #475569 !important;
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;
