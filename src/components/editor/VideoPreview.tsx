'use client';

import { useEditorStore } from '@/store/editor-store';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, Download, Loader2, Video } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Player } from '@remotion/player';
import { DynamicVideo, getCompositionConfig } from '@/lib/video/compositions/DynamicVideo';
import { type VideoPlan, type AIDecision, COMPONENT_IDS } from '@/lib/video/schemas';

// Generate a simple plan from content blocks
function generatePlanFromBlocks(videoInput: { contentBlocks: Array<{ type: string; duration?: number }> }): VideoPlan {
  const typeToComponentId: Record<string, string> = {
    'stat': COMPONENT_IDS.STAT,
    'comparison': COMPONENT_IDS.COMPARISON,
    'text': COMPONENT_IDS.TEXT,
    'image': COMPONENT_IDS.IMAGE,
    'quote': COMPONENT_IDS.QUOTE,
    'list': COMPONENT_IDS.LIST,
    'timeline': COMPONENT_IDS.TIMELINE,
    'callout': COMPONENT_IDS.CALLOUT,
    'icon-list': COMPONENT_IDS.ICON_LIST,
    'line-chart': COMPONENT_IDS.LINE_CHART,
    'pie-chart': COMPONENT_IDS.PIE_CHART,
    'code': COMPONENT_IDS.CODE,
    'testimonial': COMPONENT_IDS.TESTIMONIAL,
    'whatsapp-chat': COMPONENT_IDS.WHATSAPP_CHAT,
    'motivational-image': COMPONENT_IDS.MOTIVATIONAL_IMAGE,
  };

  const decisions: AIDecision[] = videoInput.contentBlocks.map((block) => {
    const duration = block.duration || getDefaultDuration(block.type);
    return {
      componentId: typeToComponentId[block.type] || COMPONENT_IDS.TEXT,
      motionProfile: 'dynamic' as const,
      duration,
      animation: {
        enter: 0.4,
        hold: duration - 0.6,
        exit: 0.2,
      },
    };
  });

  const totalDuration = decisions.reduce((sum, d) => sum + d.duration, 0);

  return {
    decisions,
    totalDuration,
    suggestedTransitions: decisions.map(() => 'fade' as const),
  };
}

function getDefaultDuration(type: string): number {
  const durations: Record<string, number> = {
    'stat': 3,
    'comparison': 4,
    'text': 3,
    'image': 4,
    'quote': 4,
    'list': 5,
    'timeline': 6,
    'callout': 3,
    'icon-list': 5,
    'line-chart': 5,
    'pie-chart': 5,
    'code': 6,
    'testimonial': 5,
    'whatsapp-chat': 8,
    'motivational-image': 6,
  };
  return durations[type] || 4;
}

export function VideoPreview() {
  const { videoInput, exportVideo } = useEditorStore();
  const [isExporting, setIsExporting] = useState(false);

  // Generate plan from blocks
  const plan = useMemo(() => generatePlanFromBlocks(videoInput), [videoInput]);

  // Get composition config
  const config = useMemo(() => {
    if (videoInput.contentBlocks.length === 0) return null;
    return getCompositionConfig(videoInput, plan);
  }, [videoInput, plan]);

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

  // Get preview dimensions based on aspect ratio
  const getPreviewDimensions = () => {
    const ratio = videoInput.videoMeta.aspectRatio;
    switch (ratio) {
      case '9:16':
        return { width: 270, height: 480 };
      case '16:9':
        return { width: 480, height: 270 };
      case '1:1':
        return { width: 360, height: 360 };
      case '4:5':
        return { width: 360, height: 450 };
      default:
        return { width: 270, height: 480 };
    }
  };

  const previewDims = getPreviewDimensions();

  return (
    <div className="flex-1 flex flex-col bg-gray-950 min-h-0">
      {/* Toolbar */}
      <div className="h-12 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-white font-medium">Preview</span>
          {config && (
            <span className="text-xs text-gray-400">
              {previewDims.width}x{previewDims.height} • {plan.totalDuration.toFixed(1)}s
            </span>
          )}
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
                Export MP4
              </>
            )}
          </Button>
        </div>
      </div>
      
      {/* Preview Area */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden min-h-0">
        {videoInput.contentBlocks.length === 0 ? (
          <div className="text-center">
            <Video className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No blocks added yet</p>
            <p className="text-gray-500 text-sm mt-1">Click blocks in the library to add them</p>
          </div>
        ) : config ? (
          <div className="rounded-lg overflow-hidden shadow-2xl border border-gray-800">
            <Player
              component={DynamicVideo}
              inputProps={{ input: videoInput, plan }}
              durationInFrames={config.durationInFrames}
              compositionWidth={config.width}
              compositionHeight={config.height}
              fps={config.fps}
              style={{
                width: previewDims.width,
                height: previewDims.height,
              }}
              controls
              loop
              autoPlay
            />
          </div>
        ) : null}
      </div>
      
      {/* Info Bar */}
      <div className="h-8 bg-gray-900 border-t border-gray-800 flex items-center justify-center flex-shrink-0">
        <p className="text-xs text-gray-500">
          Theme: {videoInput.videoMeta.theme} • FPS: {videoInput.videoMeta.fps} • {videoInput.videoMeta.aspectRatio}
        </p>
      </div>
    </div>
  );
}
