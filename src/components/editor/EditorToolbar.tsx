'use client';

import { useEditorStore } from '@/store/editor-store';
import { Button } from '@/components/ui/button';
import { Undo2, Redo2, Code, FileJson, Upload } from 'lucide-react';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

export function EditorToolbar() {
  const { undo, redo, canUndo, canRedo, getVideoJson, setVideoInput, videoInput } = useEditorStore();
  const [jsonDialogOpen, setJsonDialogOpen] = useState(false);
  const [importJson, setImportJson] = useState('');

  const handleImport = () => {
    try {
      const parsed = JSON.parse(importJson);
      setVideoInput(parsed);
      setJsonDialogOpen(false);
      setImportJson('');
    } catch {
      alert('Invalid JSON format');
    }
  };

  const handleExportJson = () => {
    const json = getVideoJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `video-project-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-12 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4">
      {/* Left side - Logo and title */}
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-bold text-white">
          🎬 Video Editor
        </h1>
        <span className="text-xs text-gray-500">
          {videoInput.contentBlocks.length} blocks
        </span>
      </div>
      
      {/* Center - Undo/Redo */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-300 hover:text-white disabled:opacity-50"
          onClick={undo}
          disabled={!canUndo()}
          title="Undo"
        >
          <Undo2 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-300 hover:text-white disabled:opacity-50"
          onClick={redo}
          disabled={!canRedo()}
          title="Redo"
        >
          <Redo2 className="w-4 h-4" />
        </Button>
      </div>
      
      {/* Right side - Import/Export */}
      <div className="flex items-center gap-2">
        {/* Import JSON */}
        <Dialog open={jsonDialogOpen} onOpenChange={setJsonDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-300 hover:text-white"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">Import JSON Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                placeholder="Paste your JSON here..."
                className="bg-gray-800 border-gray-700 text-white min-h-[300px] font-mono text-sm"
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setJsonDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleImport}>
                  Import
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        
        {/* View/Edit JSON */}
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-300 hover:text-white"
            >
              <Code className="w-4 h-4 mr-2" />
              JSON
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 border-gray-700 max-w-3xl">
            <DialogHeader>
              <DialogTitle className="text-white">Video JSON</DialogTitle>
            </DialogHeader>
            <Textarea
              value={getVideoJson()}
              readOnly
              className="bg-gray-800 border-gray-700 text-white min-h-[400px] font-mono text-sm"
            />
          </DialogContent>
        </Dialog>
        
        {/* Export JSON */}
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-300 hover:text-white"
          onClick={handleExportJson}
        >
          <FileJson className="w-4 h-4 mr-2" />
          Export JSON
        </Button>
      </div>
    </div>
  );
}
