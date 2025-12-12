"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Button } from "@/components/ui/button";
import {
    Bold,
    Italic,
    List,
    ListOrdered,
    Image as ImageIcon,
    Undo,
    Redo,
} from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";

import { MathExtension } from "@aarkue/tiptap-math-extension";
import "katex/dist/katex.min.css";
import { Sigma } from "lucide-react";

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
    const [imageUrl, setImageUrl] = useState("");
    const [imageDialogOpen, setImageDialogOpen] = useState(false);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Image.configure({
                inline: true,
                allowBase64: true,
            }),
            MathExtension.configure({
                evaluation: false,
            }),
        ],
        immediatelyRender: false,
        content: value,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: "min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 prose prose-sm max-w-none dark:prose-invert",
            },
        },
    });

    // Sync content if value changes externally (e.g. reset form)
    useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value);
        }
    }, [value, editor]);

    if (!editor) {
        return null;
    }

    const addImage = () => {
        if (imageUrl) {
            editor.chain().focus().setImage({ src: imageUrl }).run();
            setImageUrl("");
            setImageDialogOpen(false);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const base64 = event.target?.result as string;
                editor.chain().focus().setImage({ src: base64 }).run();
                setImageDialogOpen(false);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="border rounded-md overflow-hidden">
            <div className="bg-muted/50 border-b p-1 flex flex-wrap gap-1">
                <Toggle
                    size="sm"
                    pressed={editor.isActive("bold")}
                    onPressedChange={() => editor.chain().focus().toggleBold().run()}
                >
                    <Bold className="h-4 w-4" />
                </Toggle>
                <Toggle
                    size="sm"
                    pressed={editor.isActive("italic")}
                    onPressedChange={() => editor.chain().focus().toggleItalic().run()}
                >
                    <Italic className="h-4 w-4" />
                </Toggle>
                <Toggle
                    size="sm"
                    pressed={editor.isActive("bulletList")}
                    onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
                >
                    <List className="h-4 w-4" />
                </Toggle>
                <Toggle
                    size="sm"
                    pressed={editor.isActive("orderedList")}
                    onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
                >
                    <ListOrdered className="h-4 w-4" />
                </Toggle>

                <div className="w-px h-6 bg-border mx-1 self-center" />

                <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0"
                    onClick={() => {
                        editor.chain().focus().insertContent("$x^2$").run();
                    }}
                    title="Insert Math Formula (LaTeX)"
                >
                    <Sigma className="h-4 w-4" />
                </Button>

                <div className="w-px h-6 bg-border mx-1 self-center" />

                <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                            <ImageIcon className="h-4 w-4" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Insert Image</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Upload Image</Label>
                                <Input type="file" accept="image/*" onChange={handleFileUpload} />
                            </div>
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-background px-2 text-muted-foreground">
                                        Or via URL
                                    </span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Image URL</Label>
                                <Input
                                    value={imageUrl}
                                    onChange={(e) => setImageUrl(e.target.value)}
                                    placeholder="https://example.com/image.jpg"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setImageDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={addImage} disabled={!imageUrl}>
                                Insert URL
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <div className="w-px h-6 bg-border mx-1 self-center" />

                <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0"
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                >
                    <Undo className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0"
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                >
                    <Redo className="h-4 w-4" />
                </Button>
            </div>
            <EditorContent editor={editor} className="p-0" />
        </div>
    );
}
