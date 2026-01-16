'use client';

import React, { useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';

interface PremiumRichEditorProps {
    value: string;
    onChange: (content: string) => void;
    placeholder?: string;
    disabled?: boolean;
    onImageUpload?: (file: File) => Promise<string>;
}

export function PremiumRichEditor({
    value,
    onChange,
    placeholder = 'Tulis sesuatu...',
    disabled = false,
    onImageUpload,
}: PremiumRichEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            TaskList,
            TaskItem.configure({
                nested: true,
            }),
            Placeholder.configure({
                placeholder,
            }),
            Image.configure({
                allowBase64: true,
                HTMLAttributes: {
                    class: 'rounded-2xl max-w-full h-auto border-2 border-slate-200 shadow-lg my-4',
                },
            }),
        ],
        content: value,
        editable: !disabled,
        immediatelyRender: false,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
    });

    // Update editor content when value changes from outside (if needed)
    React.useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value);
        }
    }, [value, editor]);

    const addImage = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !editor) return;

        if (onImageUpload) {
            const url = await onImageUpload(file);
            editor.chain().focus().setImage({ src: url }).run();
        } else {
            // Default to base64
            const reader = new FileReader();
            reader.onload = (readerEvent) => {
                const src = readerEvent.target?.result as string;
                editor.chain().focus().setImage({ src }).run();
            };
            reader.readAsDataURL(file);
        }
    }, [editor, onImageUpload]);

    if (!editor) return null;

    const ToolbarButton = ({ onClick, active, children, title }: any) => (
        <button
            type="button"
            onClick={onClick}
            title={title}
            className={`p-2 rounded-xl transition-all ${active ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                } disabled:opacity-50`}
            disabled={disabled}
        >
            {children}
        </button>
    );

    return (
        <div className={`w-full border-2 ${disabled ? 'border-slate-100 bg-slate-50' : 'border-slate-200 bg-white shadow-sm'} rounded-[2rem] overflow-hidden transition-all focus-within:ring-4 focus-within:ring-blue-100 focus-within:border-blue-500`}>
            {!disabled && (
                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border-b-2 border-slate-100">
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        active={editor.isActive('bold')}
                        title="Tebal (Ctrl+B)"
                    >
                        <strong>B</strong>
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        active={editor.isActive('italic')}
                        title="Miring (Ctrl+I)"
                    >
                        <em>I</em>
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleStrike().run()}
                        active={editor.isActive('strike')}
                        title="Coret"
                    >
                        <s>S</s>
                    </ToolbarButton>
                    <div className="w-px h-8 bg-slate-200 mx-1 self-center" />
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        active={editor.isActive('bulletList')}
                        title="Bullet List"
                    >
                        • List
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        active={editor.isActive('orderedList')}
                        title="Numbered List"
                    >
                        1. List
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleTaskList().run()}
                        active={editor.isActive('taskList')}
                        title="Checklist"
                    >
                        ✅ Task
                    </ToolbarButton>
                    <div className="w-px h-8 bg-slate-200 mx-1 self-center" />
                    <label className="cursor-pointer">
                        <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={addImage}
                            disabled={disabled}
                        />
                        <div className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all">
                            🖼️ Gambar
                        </div>
                    </label>
                    <div className="flex-1" />
                    <ToolbarButton
                        onClick={() => editor.chain().focus().undo().run()}
                        title="Urungkan (Ctrl+Z)"
                    >
                        ↩️
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().redo().run()}
                        title="Ulangi (Ctrl+Y)"
                    >
                        ↪️
                    </ToolbarButton>
                </div>
            )}
            <div className={`p-6 prose prose-slate max-w-none min-h-[250px] ${disabled ? 'cursor-not-allowed' : 'cursor-text'}`}>
                <EditorContent editor={editor} />
            </div>

            <style jsx global>{`
                .ProseMirror {
                    outline: none;
                }
                .ProseMirror p.is-editor-empty:first-child::before {
                    content: attr(data-placeholder);
                    float: left;
                    color: #adb5bd;
                    pointer-events: none;
                    height: 0;
                }
                .ProseMirror ul, .ProseMirror ol {
                    padding: 0 1rem;
                    margin: 1rem 0;
                }
                .ProseMirror ul {
                    list-style-type: disc;
                }
                .ProseMirror ol {
                    list-style-type: decimal;
                }
                .ProseMirror ul[data-type="taskList"] {
                    list-style: none;
                    padding: 0;
                }
                .ProseMirror ul[data-type="taskList"] li {
                    display: flex;
                    align-items: flex-start;
                    gap: 0.5rem;
                    margin: 0.5rem 0;
                }
                .ProseMirror ul[data-type="taskList"] li > label {
                    flex: 0 0 auto;
                    user-select: none;
                    margin-top: 0.2rem;
                }
                .ProseMirror ul[data-type="taskList"] li > div {
                    flex: 1 1 auto;
                }
                .ProseMirror ul[data-type="taskList"] input[type="checkbox"] {
                    cursor: pointer;
                    width: 1.25rem;
                    height: 1.25rem;
                    border: 2px solid #cbd5e1;
                    border-radius: 0.375rem;
                    appearance: none;
                    background-color: #fff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }
                .ProseMirror ul[data-type="taskList"] input[type="checkbox"]:checked {
                    background-color: #3b82f6;
                    border-color: #3b82f6;
                }
                .ProseMirror ul[data-type="taskList"] input[type="checkbox"]:checked::after {
                    content: '✓';
                    color: white;
                    font-size: 0.8rem;
                    font-weight: bold;
                }
            `}</style>
        </div>
    );
}
