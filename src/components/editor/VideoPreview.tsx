'use client';

import { useEditorStore } from '@/store/editor-store';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, Download, Loader2 } from 'lucide-react';
import { useState } from 'react';

export function VideoPreview() {
  const { videoInput, isPlaying, setIsPlaying, currentTime, setCurrentTime, exportVideo } = useEditorStore();
  const [isExporting, setIsExporting] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const handleExport = async () => {
    if (videoInput.contentBlocks.length === 0) {
      alert('Please add at least one block to export');
      return;
    }

    setIsExporting(true);
    try {
      const blob = await exportVideo();
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `video-${Date.now()}.mp4`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        alert('Failed to export video. Please try again.');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export video. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Calculate aspect ratio for preview
  const getAspectRatioStyle = () => {
    const ratio = videoInput.videoMeta.aspectRatio;
    switch (ratio) {
      case '9:16':
        return { width: '180px', height: '320px' };
      case '16:9':
        return { width: '320px', height: '180px' };
      case '1:1':
        return { width: '240px', height: '240px' };
      case '4:5':
        return { width: '240px', height: '300px' };
      default:
        return { width: '180px', height: '320px' };
    }
  };

  // Get theme colors
  const getThemeColors = () => {
    const theme = videoInput.videoMeta.theme;
    switch (theme) {
      case 'dark_modern':
        return { bg: 'bg-gray-900', text: 'text-white' };
      case 'light_minimal':
        return { bg: 'bg-white', text: 'text-gray-900' };
      case 'bold_vibrant':
        return { bg: 'bg-gradient-to-br from-purple-900 to-pink-900', text: 'text-white' };
      case 'corporate':
        return { bg: 'bg-slate-800', text: 'text-white' };
      default:
        return { bg: 'bg-gray-900', text: 'text-white' };
    }
  };

  const themeColors = getThemeColors();

  return (
    <div className="flex-1 flex flex-col bg-gray-950">
      {/* Toolbar */}
      <div className="h-12 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-300 hover:text-white"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-300 hover:text-white"
            onClick={() => setCurrentTime(0)}
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">
            {videoInput.contentBlocks.length} blocks
          </span>
          <Button
            size="sm"
            className="bg-purple-600 hover:bg-purple-700 text-white"
            onClick={handleExport}
            disabled={isExporting || videoInput.contentBlocks.length === 0}
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export
              </>
            )}
          </Button>
        </div>
      </div>
      
      {/* Preview Area */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div 
          className={`relative rounded-lg overflow-hidden shadow-2xl ${themeColors.bg}`}
          style={getAspectRatioStyle()}
        >
          {/* Preview content based on blocks */}
          <div className="absolute inset-0 flex items-center justify-center">
            {videoInput.contentBlocks.length === 0 ? (
              <div className="text-center p-4">
                <p className="text-gray-500 text-sm">No blocks added</p>
                <p className="text-gray-600 text-xs mt-1">Add blocks from the library</p>
              </div>
            ) : (
              <div className="w-full h-full p-4 flex items-center justify-center">
                {/* Simple block preview - shows first block */}
                <div className={`text-center ${themeColors.text}`}>
                  <p className="text-sm font-medium">
                    {getBlockPreview(videoInput.contentBlocks[0])}
                  </p>
                  {videoInput.contentBlocks.length > 1 && (
                    <p className="text-xs text-gray-500 mt-2">
                      +{videoInput.contentBlocks.length - 1} more blocks
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Aspect ratio indicator */}
          <div className="absolute bottom-2 right-2 bg-black/50 px-2 py-1 rounded text-xs text-white">
            {videoInput.videoMeta.aspectRatio}
          </div>
        </div>
      </div>
      
      {/* Info Bar */}
      <div className="h-8 bg-gray-900 border-t border-gray-800 flex items-center justify-center">
        <p className="text-xs text-gray-500">
          Theme: {videoInput.videoMeta.theme} • FPS: {videoInput.videoMeta.fps}
        </p>
      </div>
    </div>
  );
}

// Helper to get preview text for a block
function getBlockPreview(block: { type: string; [key: string]: unknown }): string {
  switch (block.type) {
    case 'stat':
      return `${(block as { value?: string }).value || 'N/A'} - ${(block as { heading?: string }).heading || 'Stat'}`;
    case 'text':
      return (block as { content?: string }).content?.slice(0, 30) || 'Text block';
    case 'quote':
      return `"${(block as { text?: string }).text?.slice(0, 25) || 'Quote'}..."`;
    case 'image':
      return '📷 Image';
    case 'list':
      return `📋 ${(block as { items?: unknown[] }).items?.length || 0} items`;
    case 'timeline':
      return `📅 ${(block as { events?: unknown[] }).events?.length || 0} events`;
    case 'comparison':
      return `📊 ${(block as { items?: unknown[] }).items?.length || 0} items`;
    case 'callout':
      return `⚠️ ${(block as { title?: string }).title || 'Callout'}`;
    case 'code':
      return `💻 ${(block as { language?: string }).language || 'Code'}`;
    case 'testimonial':
      return `💬 ${(block as { author?: string }).author || 'Testimonial'}`;
    case 'whatsapp-chat':
      return `📱 ${(block as { messages?: unknown[] }).messages?.length || 0} messages`;
    case 'motivational-image':
      return (block as { text?: string }).text?.slice(0, 30) || 'Motivational';
    case 'line-chart':
      return `📈 Line Chart`;
    case 'pie-chart':
      return `🥧 Pie Chart`;
    case 'icon-list':
      return `🎯 ${(block as { items?: unknown[] }).items?.length || 0} icons`;
    default:
      return block.type;
  }
}
