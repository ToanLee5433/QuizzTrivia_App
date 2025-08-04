import React, { useMemo, useCallback } from 'react';
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
  // Memoize the change handler to prevent unnecessary re-renders
  const handleChange = useCallback((content: string) => {
    onChange(content);
  }, [onChange]);

  // Quill modules configuration
  const modules = useMemo(() => ({
    toolbar: !readOnly ? {
      container: [
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        [{ 'font': [] }],
        [{ 'size': ['small', false, 'large', 'huge'] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'script': 'sub' }, { 'script': 'super' }],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        [{ 'indent': '-1' }, { 'indent': '+1' }],
        [{ 'direction': 'rtl' }],
        [{ 'align': [] }],
        ['link', 'image', 'video'],
        ['blockquote', 'code-block'],
        ['clean']
      ]
    } : false,
    clipboard: {
      matchVisual: false,
    }
  }), [readOnly]);

  // Quill formats
  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'script',
    'list', 'bullet', 'indent',
    'direction', 'align',
    'link', 'image', 'video',
    'blockquote', 'code-block'
  ];

  return (
    <div className={`rich-text-editor ${className}`}>
      <ReactQuill
        theme="snow"
        value={value || ''}
        onChange={handleChange}
        placeholder={placeholder}
        readOnly={readOnly}
        modules={modules}
        formats={formats}
        style={{
          height: `${height}px`,
          marginBottom: '50px'
        }}
      />
      <style dangerouslySetInnerHTML={{
        __html: `
          .rich-text-editor .ql-editor {
            min-height: ${height - 80}px;
            font-family: inherit;
            font-size: 14px;
            line-height: 1.5;
          }
          .rich-text-editor .ql-toolbar {
            border: 1px solid #e5e7eb;
            border-bottom: none;
            border-radius: 8px 8px 0 0;
            background: white;
          }
          .rich-text-editor .ql-container {
            border: 1px solid #e5e7eb;
            border-radius: 0 0 8px 8px;
            font-family: inherit;
            background: white;
          }
          .rich-text-editor .ql-editor.ql-blank::before {
            font-style: normal;
            color: #9ca3af;
          }
          .rich-text-editor .ql-toolbar.ql-snow {
            border-color: #e5e7eb;
          }
          .rich-text-editor .ql-container.ql-snow {
            border-color: #e5e7eb;
          }
          .rich-text-editor .ql-editor:focus {
            outline: none;
          }
          .rich-text-editor .ql-toolbar .ql-picker-label:hover,
          .rich-text-editor .ql-toolbar .ql-picker-item:hover {
            color: #3b82f6;
          }
          .rich-text-editor .ql-toolbar button:hover {
            color: #3b82f6;
          }
          .rich-text-editor .ql-toolbar button.ql-active {
            color: #3b82f6;
          }
        `
      }} />
    </div>
  );
};

export default RichTextEditor;
