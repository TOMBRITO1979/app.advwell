import React, { useMemo } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  minHeight?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Digite o conteúdo...',
  readOnly = false,
  minHeight = '300px',
}) => {
  const modules = useMemo(() => ({
    toolbar: readOnly ? false : {
      container: [
        // Linha 1: Estrutura do documento
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        [{ 'font': [] }, { 'size': ['small', false, 'large', 'huge'] }],

        // Linha 2: Formatação de texto
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'script': 'sub' }, { 'script': 'super' }],

        // Linha 3: Cores e alinhamento
        [{ 'color': [] }, { 'background': [] }],
        [{ 'align': [] }],

        // Linha 4: Listas e indentação
        [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'list': 'check' }],
        [{ 'indent': '-1' }, { 'indent': '+1' }],

        // Linha 5: Blocos especiais e mídia
        ['blockquote', 'code-block'],
        ['link', 'image'],

        // Linha 6: Limpar formatação
        ['clean'],
      ],
    },
    clipboard: {
      matchVisual: false,
    },
  }), [readOnly]);

  const formats = [
    'header',
    'font',
    'size',
    'bold', 'italic', 'underline', 'strike',
    'script',
    'color', 'background',
    'align',
    'list', 'bullet', 'check',
    'indent',
    'blockquote', 'code-block',
    'link', 'image',
  ];

  return (
    <div className="rich-text-editor">
      <style>{`
        /* Container principal */
        .rich-text-editor {
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
        }

        /* Toolbar - Visual mais compacto e harmonioso */
        .rich-text-editor .ql-toolbar {
          border: 1px solid #e5e7eb;
          border-bottom: none;
          border-top-left-radius: 8px;
          border-top-right-radius: 8px;
          background: linear-gradient(to bottom, #f9fafb, #f3f4f6);
          padding: 8px 12px;
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }

        /* Grupos de botões */
        .rich-text-editor .ql-toolbar .ql-formats {
          margin-right: 8px;
          padding-right: 8px;
          border-right: 1px solid #e5e7eb;
          display: inline-flex;
          align-items: center;
          gap: 2px;
        }

        .rich-text-editor .ql-toolbar .ql-formats:last-child {
          border-right: none;
          margin-right: 0;
          padding-right: 0;
        }

        /* Botões da toolbar */
        .rich-text-editor .ql-toolbar button {
          width: 28px;
          height: 28px;
          padding: 4px;
          border-radius: 4px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }

        .rich-text-editor .ql-toolbar button:hover {
          background-color: #e5e7eb;
        }

        .rich-text-editor .ql-toolbar button.ql-active {
          background-color: #3b82f6;
          color: white;
        }

        .rich-text-editor .ql-toolbar button.ql-active .ql-stroke {
          stroke: white;
        }

        .rich-text-editor .ql-toolbar button.ql-active .ql-fill {
          fill: white;
        }

        /* Dropdowns (font, size, header, color) */
        .rich-text-editor .ql-toolbar .ql-picker {
          height: 28px;
          border-radius: 4px;
          transition: all 0.15s ease;
        }

        .rich-text-editor .ql-toolbar .ql-picker:hover {
          background-color: #e5e7eb;
        }

        .rich-text-editor .ql-toolbar .ql-picker-label {
          padding: 2px 8px;
          border: none;
          font-size: 13px;
        }

        .rich-text-editor .ql-toolbar .ql-picker-options {
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          padding: 4px;
        }

        .rich-text-editor .ql-toolbar .ql-picker-item {
          padding: 4px 8px;
          border-radius: 4px;
        }

        .rich-text-editor .ql-toolbar .ql-picker-item:hover {
          background-color: #f3f4f6;
        }

        /* Container do editor */
        .rich-text-editor .ql-container {
          min-height: ${minHeight};
          font-size: 14px;
          font-family: inherit;
          border: 1px solid #e5e7eb;
          border-top: none;
          border-bottom-left-radius: 8px;
          border-bottom-right-radius: 8px;
          background-color: white;
        }

        /* Área de edição */
        .rich-text-editor .ql-editor {
          min-height: ${minHeight};
          padding: 16px 20px;
          line-height: 1.6;
        }

        .rich-text-editor .ql-editor.ql-blank::before {
          font-style: normal;
          color: #9ca3af;
          left: 20px;
        }

        /* Estilos para conteúdo */
        .rich-text-editor .ql-editor h1 {
          font-size: 2em;
          font-weight: 700;
          margin: 0.67em 0;
        }

        .rich-text-editor .ql-editor h2 {
          font-size: 1.5em;
          font-weight: 600;
          margin: 0.75em 0;
        }

        .rich-text-editor .ql-editor h3 {
          font-size: 1.25em;
          font-weight: 600;
          margin: 0.83em 0;
        }

        .rich-text-editor .ql-editor blockquote {
          border-left: 4px solid #3b82f6;
          padding-left: 16px;
          margin: 16px 0;
          color: #4b5563;
          background-color: #f9fafb;
          padding: 12px 16px;
          border-radius: 0 6px 6px 0;
        }

        .rich-text-editor .ql-editor pre.ql-syntax {
          background-color: #1f2937;
          color: #e5e7eb;
          border-radius: 6px;
          padding: 12px 16px;
          font-family: 'Fira Code', 'Consolas', monospace;
          font-size: 13px;
          overflow-x: auto;
        }

        .rich-text-editor .ql-editor ul[data-checked="true"] > li::before,
        .rich-text-editor .ql-editor ul[data-checked="false"] > li::before {
          color: #3b82f6;
        }

        .rich-text-editor .ql-editor img {
          max-width: 100%;
          border-radius: 6px;
          margin: 8px 0;
        }

        .rich-text-editor .ql-editor a {
          color: #3b82f6;
          text-decoration: underline;
        }

        .rich-text-editor .ql-editor a:hover {
          color: #2563eb;
        }

        /* Tooltip customizado */
        .rich-text-editor .ql-tooltip {
          border-radius: 6px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
          padding: 8px 12px;
        }

        .rich-text-editor .ql-tooltip input[type="text"] {
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          padding: 4px 8px;
        }

        .rich-text-editor .ql-tooltip a.ql-action,
        .rich-text-editor .ql-tooltip a.ql-remove {
          color: #3b82f6;
          margin-left: 8px;
        }

        /* Responsivo */
        @media (max-width: 640px) {
          .rich-text-editor .ql-toolbar {
            padding: 6px 8px;
          }

          .rich-text-editor .ql-toolbar .ql-formats {
            margin-right: 4px;
            padding-right: 4px;
          }

          .rich-text-editor .ql-toolbar button {
            width: 24px;
            height: 24px;
          }

          .rich-text-editor .ql-editor {
            padding: 12px 14px;
          }
        }

        /* ========== DARK MODE ========== */

        /* Container principal - dark */
        .dark .rich-text-editor {
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.3);
        }

        /* Toolbar - dark */
        .dark .rich-text-editor .ql-toolbar {
          border-color: #475569;
          background: linear-gradient(to bottom, #334155, #1e293b);
        }

        /* Grupos de botões - dark */
        .dark .rich-text-editor .ql-toolbar .ql-formats {
          border-right-color: #475569;
        }

        /* Botões da toolbar - dark */
        .dark .rich-text-editor .ql-toolbar button {
          color: #e2e8f0;
        }

        .dark .rich-text-editor .ql-toolbar button:hover {
          background-color: #475569;
        }

        .dark .rich-text-editor .ql-toolbar button .ql-stroke {
          stroke: #e2e8f0;
        }

        .dark .rich-text-editor .ql-toolbar button .ql-fill {
          fill: #e2e8f0;
        }

        .dark .rich-text-editor .ql-toolbar button.ql-active {
          background-color: #3b82f6;
        }

        /* Dropdowns - dark */
        .dark .rich-text-editor .ql-toolbar .ql-picker {
          color: #e2e8f0;
        }

        .dark .rich-text-editor .ql-toolbar .ql-picker:hover {
          background-color: #475569;
        }

        .dark .rich-text-editor .ql-toolbar .ql-picker-label {
          color: #e2e8f0;
        }

        .dark .rich-text-editor .ql-toolbar .ql-picker-label .ql-stroke {
          stroke: #e2e8f0;
        }

        .dark .rich-text-editor .ql-toolbar .ql-picker-options {
          background-color: #1e293b;
          border-color: #475569;
        }

        .dark .rich-text-editor .ql-toolbar .ql-picker-item {
          color: #e2e8f0;
        }

        .dark .rich-text-editor .ql-toolbar .ql-picker-item:hover {
          background-color: #334155;
        }

        /* Container do editor - dark */
        .dark .rich-text-editor .ql-container {
          border-color: #475569;
          background-color: #1e293b;
        }

        /* Área de edição - dark */
        .dark .rich-text-editor .ql-editor {
          color: #f1f5f9;
        }

        .dark .rich-text-editor .ql-editor.ql-blank::before {
          color: #64748b;
        }

        /* Estilos de conteúdo - dark */
        .dark .rich-text-editor .ql-editor blockquote {
          color: #cbd5e1;
          background-color: #334155;
          border-left-color: #3b82f6;
        }

        .dark .rich-text-editor .ql-editor pre.ql-syntax {
          background-color: #0f172a;
          color: #e2e8f0;
        }

        .dark .rich-text-editor .ql-editor a {
          color: #60a5fa;
        }

        .dark .rich-text-editor .ql-editor a:hover {
          color: #93c5fd;
        }

        /* Tooltip - dark */
        .dark .rich-text-editor .ql-tooltip {
          background-color: #1e293b;
          border-color: #475569;
          color: #e2e8f0;
        }

        .dark .rich-text-editor .ql-tooltip input[type="text"] {
          background-color: #334155;
          border-color: #475569;
          color: #f1f5f9;
        }

        .dark .rich-text-editor .ql-tooltip a.ql-action,
        .dark .rich-text-editor .ql-tooltip a.ql-remove {
          color: #60a5fa;
        }

        /* Snow theme overrides - dark */
        .dark .rich-text-editor .ql-snow .ql-stroke {
          stroke: #e2e8f0;
        }

        .dark .rich-text-editor .ql-snow .ql-fill,
        .dark .rich-text-editor .ql-snow .ql-stroke.ql-fill {
          fill: #e2e8f0;
        }

        .dark .rich-text-editor .ql-snow .ql-picker {
          color: #e2e8f0;
        }
      `}</style>
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        readOnly={readOnly}
      />
    </div>
  );
};

export default RichTextEditor;
