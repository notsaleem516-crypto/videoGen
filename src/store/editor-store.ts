import { create } from 'zustand';
import { ContentBlock, VideoMeta, VideoInput, AudioTrack, BlockCustomization } from '@/lib/video/schemas';

// Default customization values for all blocks
// Only set values that should override the BaseScene defaults
const DEFAULT_CUSTOMIZATION: Partial<BlockCustomization> = {
  enterAnimation: 'fade',
  exitAnimation: 'fade',
  animationDuration: 0.5,
  backgroundBlur: 0,
  borderWidth: 0,
  borderRadius: 0,
  shadowEnabled: false,
  shadowColor: 'rgba(0,0,0,0.5)',
  shadowBlur: 20,
  // Don't set padding - let BaseScene use its default of 60
  // padding: 20,  // Removed - this was causing blocks to appear at top
  margin: 0,
};

// Block templates for adding new blocks
export const BLOCK_TEMPLATES: Record<string, Partial<ContentBlock>> = {
  stat: {
    type: 'stat',
    heading: 'New Stat',
    value: '100%',
    subtext: 'Description here',
  } as ContentBlock,
  comparison: {
    type: 'comparison',
    title: 'Comparison',
    items: [
      { label: 'Item A', value: 50, color: '#3B82F6' },
      { label: 'Item B', value: 30, color: '#10B981' },
    ],
  } as ContentBlock,
  text: {
    type: 'text',
    content: 'Enter your text here',
    emphasis: 'medium',
  } as ContentBlock,
  image: {
    type: 'image',
    src: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800',
    alt: 'Image',
    caption: '',
  } as ContentBlock,
  quote: {
    type: 'quote',
    text: 'Enter your quote here',
    author: 'Author Name',
  } as ContentBlock,
  list: {
    type: 'list',
    title: 'List Title',
    items: ['Item 1', 'Item 2', 'Item 3'],
    style: 'bullet',
  } as ContentBlock,
  timeline: {
    type: 'timeline',
    title: 'Timeline',
    events: [
      { year: '2020', title: 'Event 1', description: '' },
      { year: '2022', title: 'Event 2', description: '' },
    ],
  } as ContentBlock,
  callout: {
    type: 'callout',
    title: 'Callout',
    content: 'Important information',
    variant: 'default',
  } as ContentBlock,
  'icon-list': {
    type: 'icon-list',
    title: 'Features',
    items: [
      { icon: '🚀', title: 'Feature 1', description: '' },
      { icon: '⭐', title: 'Feature 2', description: '' },
    ],
  } as ContentBlock,
  'line-chart': {
    type: 'line-chart',
    title: 'Chart',
    data: [10, 25, 40, 60, 80],
    labels: ['A', 'B', 'C', 'D', 'E'],
    lineColor: '#3B82F6',
  } as ContentBlock,
  'pie-chart': {
    type: 'pie-chart',
    title: 'Pie Chart',
    segments: [
      { label: 'Segment A', value: 40, color: '#3B82F6' },
      { label: 'Segment B', value: 35, color: '#10B981' },
      { label: 'Segment C', value: 25, color: '#F59E0B' },
    ],
  } as ContentBlock,
  code: {
    type: 'code',
    code: '// Your code here\nconsole.log("Hello World");',
    language: 'javascript',
    title: 'Code Example',
  } as ContentBlock,
  testimonial: {
    type: 'testimonial',
    quote: 'Customer testimonial here',
    author: 'Customer Name',
    role: 'Role',
    company: 'Company',
  } as ContentBlock,
  'whatsapp-chat': {
    type: 'whatsapp-chat',
    person1: { name: 'You', isOnline: true },
    person2: { name: 'Contact', isOnline: true },
    messages: [
      { from: 'person2', text: 'Hello!' },
      { from: 'person1', text: 'Hi there!' },
    ],
    showTypingIndicator: true,
  } as ContentBlock,
  'motivational-image': {
    type: 'motivational-image',
    imageSrc: 'https://images.unsplash.com/photo-1504805572947-34fad45aed93?w=800',
    imageEffect: 'ken-burns',
    text: 'Your motivational text',
    textStyle: 'default',
    fontSize: 'xlarge',
    fontWeight: 'bold',
    textColor: '#FFFFFF',
    textAlign: 'center',
    textPosition: 'center',
    colorOverlay: { enabled: true, color: '#000000', opacity: 0.4 },
    duration: 6,
  } as ContentBlock,
  // New block templates
  counter: {
    type: 'counter',
    label: 'Downloads',
    from: 0,
    to: 10000,
    duration: 3,
    suffix: '+',
    color: '#3B82F6',
    animationStyle: 'easeOut',
  } as ContentBlock,
  'progress-bar': {
    type: 'progress-bar',
    label: 'Progress',
    value: 75,
    color: '#10B981',
    backgroundColor: '#1F2937',
    height: 'medium',
    showPercentage: true,
    animated: true,
    stripes: false,
  } as ContentBlock,
  'qr-code': {
    type: 'qr-code',
    data: 'https://example.com',
    title: 'Scan Me',
    subtitle: 'Visit our website',
    size: 'medium',
    fgColor: '#000000',
    bgColor: '#FFFFFF',
  } as ContentBlock,
  video: {
    type: 'video',
    src: 'https://www.w3schools.com/html/mov_bbb.mp4',
    autoPlay: true,
    loop: false,
    muted: true,
    controls: false,
  } as ContentBlock,
  'avatar-grid': {
    type: 'avatar-grid',
    title: 'Our Team',
    subtitle: 'Meet the amazing people behind our success',
    avatars: [
      { name: 'John Doe', role: 'CEO', image: '' },
      { name: 'Jane Smith', role: 'CTO', image: '' },
      { name: 'Bob Wilson', role: 'Designer', image: '' },
    ],
    layout: 'grid',
    columns: 3,
  } as ContentBlock,
  'social-stats': {
    type: 'social-stats',
    platform: 'twitter',
    username: '@username',
    followers: 50000,
    posts: 1250,
    verified: true,
    showGrowth: true,
    growthPercentage: 15.5,
  } as ContentBlock,
  cta: {
    type: 'cta',
    text: 'Get Started Now',
    description: 'Join thousands of satisfied users',
    buttonStyle: 'primary',
    color: '#3B82F6',
    size: 'large',
    pulse: true,
  } as ContentBlock,
  'gradient-text': {
    type: 'gradient-text',
    text: 'Make It Happen',
    gradient: ['#3B82F6', '#8B5CF6', '#EC4899'],
    angle: 45,
    animate: true,
    animationSpeed: 3,
    fontSize: 'xxlarge',
    fontWeight: 'bold',
  } as ContentBlock,
  'animated-bg': {
    type: 'animated-bg',
    style: 'particles',
    primaryColor: '#3B82F6',
    secondaryColor: '#8B5CF6',
    speed: 1,
    intensity: 0.5,
    overlay: false,
  } as ContentBlock,
  countdown: {
    type: 'countdown',
    title: 'Limited Time Offer',
    days: 3,
    hours: 12,
    minutes: 30,
    seconds: 0,
    style: 'modern',
    color: '#FFFFFF',
    showLabels: true,
  } as ContentBlock,
  'weather-block': {
    type: 'weather-block',
    location: 'San Francisco',
    temperature: 72,
    unit: 'F',
    condition: 'partly-cloudy',
    description: 'Partly Cloudy',
    humidity: 65,
    windSpeed: 12,
    highTemp: 78,
    lowTemp: 58,
    showForecast: true,
    showDetails: true,
    cardStyle: 'glass',
    accentColor: '#38BDF8',
    animateIcon: true,
  } as ContentBlock,
  'tower-chart-3d': {
    type: 'tower-chart-3d',
    title: 'Top Video Games by Sales',
    subtitle: 'All Time Best Sellers',
    items: [
      { rank: 1, name: 'Minecraft', value: 300000000, valueFormatted: '300M', subtitle: '2011', color: '#62B47A', image: 'https://upload.wikimedia.org/wikipedia/en/5/51/Minecraft_cover.png' },
      { rank: 2, name: 'GTA V', value: 200000000, valueFormatted: '200M', subtitle: '2013', color: '#9B87C0', image: 'https://upload.wikimedia.org/wikipedia/en/1/15/Grand_Theft_Auto_V.png' },
      { rank: 3, name: 'Tetris', value: 170000000, valueFormatted: '170M', subtitle: '1984', color: '#4FA4E7', image: 'https://upload.wikimedia.org/wikipedia/en/4/4f/Tetris_NES_cover_art.jpg' },
      { rank: 4, name: 'Wii Sports', value: 83000000, valueFormatted: '83M', subtitle: '2006', color: '#00ADD8', image: 'https://upload.wikimedia.org/wikipedia/en/8/83/Wii_Sports_European_box_art.jpg' },
      { rank: 5, name: 'PUBG', value: 75000000, valueFormatted: '75M', subtitle: '2017', color: '#F4A460', image: 'https://upload.wikimedia.org/wikipedia/en/9/9f/Pubg_Game-Cover.jpg' },
      { rank: 6, name: 'Mario Kart 8', value: 60000000, valueFormatted: '60M', subtitle: '2014', color: '#E63946', image: 'https://upload.wikimedia.org/wikipedia/en/1/1d/Mario_Kart_8_box_art.png' },
      { rank: 7, name: 'Red Dead 2', value: 55000000, valueFormatted: '55M', subtitle: '2018', color: '#C49B66', image: 'https://upload.wikimedia.org/wikipedia/en/4/44/Red_Dead_Redemption_II.jpg' },
      { rank: 8, name: 'Skyrim', value: 48000000, valueFormatted: '48M', subtitle: '2011', color: '#7B68EE', image: 'https://upload.wikimedia.org/wikipedia/en/1/1b/The_Elder_Scrolls_V_Skyrim_cover.png' },
      { rank: 9, name: 'Super Mario', value: 45000000, valueFormatted: '45M', subtitle: '2017', color: '#E52521', image: 'https://upload.wikimedia.org/wikipedia/en/8/8f/Super_Mario_Odyssey_logo.jpg' },
      { rank: 10, name: 'Animal Crossing', value: 42000000, valueFormatted: '42M', subtitle: '2020', color: '#77DD77', image: 'https://upload.wikimedia.org/wikipedia/en/8/83/Animal_Crossing_New_Horizons.jpg' },
    ],
    towerStyle: 'boxes',
    towerSpacing: 6,
    baseHeight: 3,
    maxHeight: 28,
    gradientStart: '#3B82F6',
    gradientEnd: '#8B5CF6',
    useGradientByRank: true,
    showValueLabels: true,
    showRankNumbers: true,
    cameraDistance: 30,
    cameraPauseDuration: 0.5,
    cameraMoveSpeed: 0.6,
    cameraAngle: 30,
    backgroundColor: '#050510',
    groundColor: '#0a0a20',
    showGround: true,
    ambientIntensity: 0.6,
    showLabels3D: true,
    introAnimation: 'fade',
    itemRevealDelay: 0.05,
  } as ContentBlock,
};

// History for undo/redo
interface HistoryState {
  past: VideoInput[];
  present: VideoInput;
  future: VideoInput[];
}

interface EditorStore {
  // Current video state
  videoInput: VideoInput;
  
  // UI state
  selectedBlockIndex: number | null;
  isPlaying: boolean;
  currentTime: number;
  
  // History for undo/redo
  history: HistoryState;
  
  // Actions
  setVideoInput: (input: VideoInput) => void;
  updateVideoMeta: (meta: Partial<VideoMeta>) => void;
  addBlock: (type: string) => void;
  updateBlock: (index: number, block: Partial<ContentBlock>) => void;
  removeBlock: (index: number) => void;
  duplicateBlock: (index: number) => void;
  moveBlock: (fromIndex: number, toIndex: number) => void;
  selectBlock: (index: number | null) => void;
  
  // Audio Track actions
  addAudioTrack: (track: Omit<AudioTrack, 'id'>) => void;
  updateAudioTrack: (trackId: string, track: Partial<AudioTrack>) => void;
  removeAudioTrack: (trackId: string) => void;
  moveAudioTrack: (fromIndex: number, toIndex: number) => void;
  
  // Playback
  setIsPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  
  // Undo/Redo
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  // Export
  getVideoJson: () => string;
  exportVideo: () => Promise<Blob | null>;
}

const defaultVideoMeta: VideoMeta = {
  aspectRatio: '9:16',
  theme: 'dark_modern',
  fps: 30,
  audioTracks: [],
};

const defaultVideoInput: VideoInput = {
  videoMeta: defaultVideoMeta,
  contentBlocks: [],
};

// Helper to create history snapshot
const createSnapshot = (videoInput: VideoInput): VideoInput => {
  return JSON.parse(JSON.stringify(videoInput));
};

export const useEditorStore = create<EditorStore>((set, get) => ({
  // Initial state
  videoInput: defaultVideoInput,
  selectedBlockIndex: null,
  isPlaying: false,
  currentTime: 0,
  history: {
    past: [],
    present: defaultVideoInput,
    future: [],
  },
  
  // Set entire video input
  setVideoInput: (input) => {
    const currentPresent = get().history.present;
    set({
      videoInput: input,
      history: {
        past: [...get().history.past, currentPresent].slice(-50),
        present: createSnapshot(input),
        future: [],
      },
    });
  },
  
  // Update video meta
  updateVideoMeta: (meta) => {
    const currentPresent = get().history.present;
    const newInput = {
      ...get().videoInput,
      videoMeta: { ...get().videoInput.videoMeta, ...meta },
    };
    set({
      videoInput: newInput,
      history: {
        past: [...get().history.past, currentPresent].slice(-50),
        present: createSnapshot(newInput),
        future: [],
      },
    });
  },
  
  // Add a new block
  addBlock: (type) => {
    const template = BLOCK_TEMPLATES[type];
    if (!template) return;
    
    const currentPresent = get().history.present;
    // Merge template with default customization values
    const newBlock = { 
      ...DEFAULT_CUSTOMIZATION,
      ...template 
    } as ContentBlock;
    const newInput = {
      ...get().videoInput,
      contentBlocks: [...get().videoInput.contentBlocks, newBlock],
    };
    
    set({
      videoInput: newInput,
      selectedBlockIndex: newInput.contentBlocks.length - 1,
      history: {
        past: [...get().history.past, currentPresent].slice(-50),
        present: createSnapshot(newInput),
        future: [],
      },
    });
  },
  
  // Update a block
  updateBlock: (index, blockUpdate) => {
    const blocks = get().videoInput.contentBlocks;
    if (index < 0 || index >= blocks.length) return;
    
    const currentPresent = get().history.present;
    const newBlocks = [...blocks];
    newBlocks[index] = { ...newBlocks[index], ...blockUpdate } as ContentBlock;
    
    const newInput = {
      ...get().videoInput,
      contentBlocks: newBlocks,
    };
    
    set({
      videoInput: newInput,
      history: {
        past: [...get().history.past, currentPresent].slice(-50),
        present: createSnapshot(newInput),
        future: [],
      },
    });
  },
  
  // Remove a block
  removeBlock: (index) => {
    const blocks = get().videoInput.contentBlocks;
    if (index < 0 || index >= blocks.length) return;
    
    const currentPresent = get().history.present;
    const newBlocks = blocks.filter((_, i) => i !== index);
    
    const newInput = {
      ...get().videoInput,
      contentBlocks: newBlocks,
    };
    
    set({
      videoInput: newInput,
      selectedBlockIndex: null,
      history: {
        past: [...get().history.past, currentPresent].slice(-50),
        present: createSnapshot(newInput),
        future: [],
      },
    });
  },
  
  // Duplicate a block
  duplicateBlock: (index) => {
    const blocks = get().videoInput.contentBlocks;
    if (index < 0 || index >= blocks.length) return;
    
    const currentPresent = get().history.present;
    const blockToCopy = JSON.parse(JSON.stringify(blocks[index]));
    const newBlocks = [...blocks, blockToCopy];
    
    const newInput = {
      ...get().videoInput,
      contentBlocks: newBlocks,
    };
    
    set({
      videoInput: newInput,
      selectedBlockIndex: newBlocks.length - 1,
      history: {
        past: [...get().history.past, currentPresent].slice(-50),
        present: createSnapshot(newInput),
        future: [],
      },
    });
  },
  
  // Move a block
  moveBlock: (fromIndex, toIndex) => {
    const blocks = get().videoInput.contentBlocks;
    if (fromIndex < 0 || fromIndex >= blocks.length) return;
    if (toIndex < 0 || toIndex >= blocks.length) return;
    
    const currentPresent = get().history.present;
    const newBlocks = [...blocks];
    const [movedBlock] = newBlocks.splice(fromIndex, 1);
    newBlocks.splice(toIndex, 0, movedBlock);
    
    const newInput = {
      ...get().videoInput,
      contentBlocks: newBlocks,
    };
    
    set({
      videoInput: newInput,
      history: {
        past: [...get().history.past, currentPresent].slice(-50),
        present: createSnapshot(newInput),
        future: [],
      },
    });
  },
  
  // Select a block
  selectBlock: (index) => {
    set({ selectedBlockIndex: index });
  },
  
  // Audio Track actions
  addAudioTrack: (track) => {
    const currentPresent = get().history.present;
    const newTrack: AudioTrack = {
      ...track,
      id: `audio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    
    const currentTracks = get().videoInput.videoMeta.audioTracks || [];
    const newInput = {
      ...get().videoInput,
      videoMeta: {
        ...get().videoInput.videoMeta,
        audioTracks: [...currentTracks, newTrack],
      },
    };
    
    set({
      videoInput: newInput,
      history: {
        past: [...get().history.past, currentPresent].slice(-50),
        present: createSnapshot(newInput),
        future: [],
      },
    });
  },
  
  updateAudioTrack: (trackId, trackUpdate) => {
    const currentTracks = get().videoInput.videoMeta.audioTracks || [];
    const trackIndex = currentTracks.findIndex(t => t.id === trackId);
    if (trackIndex === -1) return;
    
    const currentPresent = get().history.present;
    const newTracks = [...currentTracks];
    newTracks[trackIndex] = { ...newTracks[trackIndex], ...trackUpdate };
    
    const newInput = {
      ...get().videoInput,
      videoMeta: {
        ...get().videoInput.videoMeta,
        audioTracks: newTracks,
      },
    };
    
    set({
      videoInput: newInput,
      history: {
        past: [...get().history.past, currentPresent].slice(-50),
        present: createSnapshot(newInput),
        future: [],
      },
    });
  },
  
  removeAudioTrack: (trackId) => {
    const currentTracks = get().videoInput.videoMeta.audioTracks || [];
    const trackIndex = currentTracks.findIndex(t => t.id === trackId);
    if (trackIndex === -1) return;
    
    const currentPresent = get().history.present;
    const newTracks = currentTracks.filter(t => t.id !== trackId);
    
    const newInput = {
      ...get().videoInput,
      videoMeta: {
        ...get().videoInput.videoMeta,
        audioTracks: newTracks,
      },
    };
    
    set({
      videoInput: newInput,
      history: {
        past: [...get().history.past, currentPresent].slice(-50),
        present: createSnapshot(newInput),
        future: [],
      },
    });
  },
  
  moveAudioTrack: (fromIndex, toIndex) => {
    const currentTracks = get().videoInput.videoMeta.audioTracks || [];
    if (fromIndex < 0 || fromIndex >= currentTracks.length) return;
    if (toIndex < 0 || toIndex >= currentTracks.length) return;
    
    const currentPresent = get().history.present;
    const newTracks = [...currentTracks];
    const [movedTrack] = newTracks.splice(fromIndex, 1);
    newTracks.splice(toIndex, 0, movedTrack);
    
    const newInput = {
      ...get().videoInput,
      videoMeta: {
        ...get().videoInput.videoMeta,
        audioTracks: newTracks,
      },
    };
    
    set({
      videoInput: newInput,
      history: {
        past: [...get().history.past, currentPresent].slice(-50),
        present: createSnapshot(newInput),
        future: [],
      },
    });
  },
  
  // Playback controls
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setCurrentTime: (time) => set({ currentTime: time }),
  
  // Undo
  undo: () => {
    const { past, present, future } = get().history;
    if (past.length === 0) return;
    
    const previous = past[past.length - 1];
    const newPast = past.slice(0, -1);
    
    set({
      videoInput: previous,
      history: {
        past: newPast,
        present: previous,
        future: [present, ...future],
      },
    });
  },
  
  // Redo
  redo: () => {
    const { past, present, future } = get().history;
    if (future.length === 0) return;
    
    const next = future[0];
    const newFuture = future.slice(1);
    
    set({
      videoInput: next,
      history: {
        past: [...past, present],
        present: next,
        future: newFuture,
      },
    });
  },
  
  // Check if can undo
  canUndo: () => get().history.past.length > 0,
  
  // Check if can redo
  canRedo: () => get().history.future.length > 0,
  
  // Get video JSON
  getVideoJson: () => {
    return JSON.stringify(get().videoInput, null, 2);
  },
  
  // Export video
  exportVideo: async () => {
    try {
      const videoInput = get().videoInput;
      console.log('Exporting video with audioTracks:', videoInput.videoMeta.audioTracks);
      const response = await fetch('http://localhost:3031/render-full', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(videoInput),
      });
      
      if (!response.ok) {
        throw new Error('Render failed');
      }
      
      return await response.blob();
    } catch (error) {
      console.error('Export failed:', error);
      return null;
    }
  },
}));
