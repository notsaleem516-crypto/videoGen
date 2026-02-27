import { z } from 'zod';

// ============================================================================
// DATA LAYER - Input Schemas
// ============================================================================

/**
 * Intro/Outro configuration schema
 */
export const IntroOutroSchema = z.object({
  title: z.string().max(100).optional(),
  subtitle: z.string().max(200).optional(),
  logoUrl: z.string().url().optional(),
  duration: z.number().min(1).max(5).optional().default(2),
});

export type IntroOutroConfig = z.infer<typeof IntroOutroSchema>;

/**
 * Block customization schema - common styling options for all blocks
 */
export const BlockCustomizationSchema = z.object({
  // Position/Alignment settings
  verticalAlign: z.enum(['top', 'center', 'bottom']).default('center'),
  horizontalAlign: z.enum(['left', 'center', 'right']).default('center'),
  
  // Animation settings
  enterAnimation: z.enum(['fade', 'slide-up', 'slide-down', 'slide-left', 'slide-right', 'zoom', 'bounce', 'rotate', 'flip', 'none']).default('fade'),
  exitAnimation: z.enum(['fade', 'slide-up', 'slide-down', 'slide-left', 'slide-right', 'zoom', 'bounce', 'rotate', 'flip', 'none']).default('fade'),
  animationDuration: z.number().min(0.1).max(2).default(0.5),
  
  // Background settings
  backgroundColor: z.string().optional(),
  backgroundImage: z.string().optional(),
  backgroundBlur: z.number().min(0).max(20).default(0),
  
  // Border settings
  borderColor: z.string().optional(),
  borderWidth: z.number().min(0).max(10).default(0),
  borderRadius: z.number().min(0).max(100).default(0),
  shadowEnabled: z.boolean().default(false),
  shadowColor: z.string().default('rgba(0,0,0,0.5)'),
  shadowBlur: z.number().min(0).max(50).default(20),
  
  // Spacing settings
  padding: z.number().min(0).max(100).optional(),
  margin: z.number().min(0).max(50).default(0),
});

export type BlockCustomization = z.infer<typeof BlockCustomizationSchema>;

/**
 * Audio Track schema for multi-track audio support
 */
export const AudioTrackSchema = z.object({
  id: z.string().min(1),
  name: z.string().max(100).default('Audio Track'),
  src: z.string().min(1), // URL or file path to audio file
  volume: z.number().min(0).max(1).default(0.7), // Volume level 0-1
  startTime: z.number().min(0).default(0), // When audio starts in the video timeline (seconds)
  fadeIn: z.number().min(0).max(10).default(0), // Fade in duration in seconds
  fadeOut: z.number().min(0).max(10).default(0), // Fade out duration in seconds
  loop: z.boolean().default(true), // Whether to loop the audio
  muted: z.boolean().default(false), // Whether the track is muted
});

export type AudioTrack = z.infer<typeof AudioTrackSchema>;

/**
 * Video metadata schema
 */
export const VideoMetaSchema = z.object({
  aspectRatio: z.enum(['16:9', '9:16', '1:1', '4:5']).default('9:16'),
  theme: z.enum(['dark_modern', 'light_minimal', 'bold_vibrant', 'corporate']).default('dark_modern'),
  fps: z.number().int().min(24).max(60).default(30),
  intro: IntroOutroSchema.optional(),
  outro: IntroOutroSchema.optional(),
  audioTracks: z.array(AudioTrackSchema).optional().default([]),
});

export type VideoMeta = z.infer<typeof VideoMetaSchema>;

/**
 * Stat content block schema
 */
export const StatBlockSchema = z.object({
  type: z.literal('stat'),
  heading: z.string().min(1).max(100),
  value: z.string().min(1).max(50),
  subtext: z.string().optional(),
}).merge(BlockCustomizationSchema);

export type StatBlock = z.infer<typeof StatBlockSchema>;

/**
 * Comparison item schema
 */
export const ComparisonItemSchema = z.object({
  label: z.string().min(1).max(50),
  value: z.number().min(0),
  color: z.string().optional(),
});

export type ComparisonItem = z.infer<typeof ComparisonItemSchema>;

/**
 * Comparison content block schema
 */
export const ComparisonBlockSchema = z.object({
  type: z.literal('comparison'),
  title: z.string().min(1).max(100).optional(),
  items: z.array(ComparisonItemSchema).min(2).max(6),
}).merge(BlockCustomizationSchema);

export type ComparisonBlock = z.infer<typeof ComparisonBlockSchema>;

/**
 * Text content block schema
 */
export const TextBlockSchema = z.object({
  type: z.literal('text'),
  content: z.string().min(1).max(500),
  emphasis: z.enum(['low', 'medium', 'high']).optional(),
}).merge(BlockCustomizationSchema);

export type TextBlock = z.infer<typeof TextBlockSchema>;

/**
 * Image content block schema
 */
export const ImageBlockSchema = z.object({
  type: z.literal('image'),
  src: z.string().url(),
  alt: z.string().max(200).optional(),
  caption: z.string().max(100).optional(),
}).merge(BlockCustomizationSchema);

export type ImageBlock = z.infer<typeof ImageBlockSchema>;

/**
 * Quote content block schema
 */
export const QuoteBlockSchema = z.object({
  type: z.literal('quote'),
  text: z.string().min(1).max(300),
  author: z.string().max(100).optional(),
}).merge(BlockCustomizationSchema);

export type QuoteBlock = z.infer<typeof QuoteBlockSchema>;

/**
 * List content block schema
 */
export const ListBlockSchema = z.object({
  type: z.literal('list'),
  title: z.string().min(1).max(100).optional(),
  items: z.array(z.string().min(1).max(200)).min(1).max(10),
  style: z.enum(['bullet', 'numbered', 'checkmarks']).optional().default('bullet'),
}).merge(BlockCustomizationSchema);

export type ListBlock = z.infer<typeof ListBlockSchema>;

/**
 * Timeline event schema
 */
export const TimelineEventSchema = z.object({
  year: z.string().max(20),
  title: z.string().min(1).max(100),
  description: z.string().max(200).optional(),
});

export type TimelineEvent = z.infer<typeof TimelineEventSchema>;

/**
 * Timeline content block schema
 */
export const TimelineBlockSchema = z.object({
  type: z.literal('timeline'),
  title: z.string().min(1).max(100).optional(),
  events: z.array(TimelineEventSchema).min(2).max(8),
}).merge(BlockCustomizationSchema);

export type TimelineBlock = z.infer<typeof TimelineBlockSchema>;

/**
 * Callout content block schema
 */
export const CalloutBlockSchema = z.object({
  type: z.literal('callout'),
  title: z.string().min(1).max(100),
  content: z.string().min(1).max(300),
  variant: z.enum(['success', 'warning', 'info', 'default']).optional().default('default'),
}).merge(BlockCustomizationSchema);

export type CalloutBlock = z.infer<typeof CalloutBlockSchema>;

/**
 * Icon item schema for icon-list
 */
export const IconItemSchema = z.object({
  icon: z.string().min(1).max(50),
  title: z.string().min(1).max(100),
  description: z.string().max(200).optional(),
});

export type IconItem = z.infer<typeof IconItemSchema>;

/**
 * Icon List content block schema
 */
export const IconListBlockSchema = z.object({
  type: z.literal('icon-list'),
  title: z.string().min(1).max(100).optional(),
  items: z.array(IconItemSchema).min(1).max(6),
}).merge(BlockCustomizationSchema);

export type IconListBlock = z.infer<typeof IconListBlockSchema>;

/**
 * Line Chart content block schema
 */
export const LineChartBlockSchema = z.object({
  type: z.literal('line-chart'),
  title: z.string().min(1).max(100).optional(),
  data: z.array(z.number()).min(2).max(24),
  labels: z.array(z.string().max(20)).min(2).max(24).optional(),
  lineColor: z.string().optional(),
}).merge(BlockCustomizationSchema);

export type LineChartBlock = z.infer<typeof LineChartBlockSchema>;

/**
 * Pie Chart segment schema
 */
export const PieSegmentSchema = z.object({
  label: z.string().min(1).max(50),
  value: z.number().min(0),
  color: z.string().optional(),
});

export type PieSegment = z.infer<typeof PieSegmentSchema>;

/**
 * Pie Chart content block schema
 */
export const PieChartBlockSchema = z.object({
  type: z.literal('pie-chart'),
  title: z.string().min(1).max(100).optional(),
  segments: z.array(PieSegmentSchema).min(2).max(8),
}).merge(BlockCustomizationSchema);

export type PieChartBlock = z.infer<typeof PieChartBlockSchema>;

/**
 * Code content block schema
 */
export const CodeBlockSchema = z.object({
  type: z.literal('code'),
  code: z.string().min(1).max(2000),
  language: z.string().max(50).optional().default('javascript'),
  title: z.string().max(100).optional(),
}).merge(BlockCustomizationSchema);

export type CodeBlock = z.infer<typeof CodeBlockSchema>;

/**
 * Testimonial content block schema
 */
export const TestimonialBlockSchema = z.object({
  type: z.literal('testimonial'),
  quote: z.string().min(1).max(400),
  author: z.string().min(1).max(100),
  role: z.string().max(100).optional(),
  company: z.string().max(100).optional(),
  avatar: z.string().url().optional(),
}).merge(BlockCustomizationSchema);

export type TestimonialBlock = z.infer<typeof TestimonialBlockSchema>;

// ============================================================================
// WHATSAPP CHAT BLOCK SCHEMA
// ============================================================================

/**
 * WhatsApp chat participant schema
 */
export const WhatsAppParticipantSchema = z.object({
  name: z.string().min(1).max(50),
  avatar: z.string().optional(), // URL or placeholder
  isOnline: z.boolean().optional().default(true),
});

export type WhatsAppParticipant = z.infer<typeof WhatsAppParticipantSchema>;

/**
 * WhatsApp chat message schema
 */
export const WhatsAppMessageSchema = z.object({
  from: z.enum(['person1', 'person2']), // person1 = sender (right/green), person2 = receiver (left/white)
  text: z.string().min(1).max(500),
  time: z.string().max(20).optional(), // e.g., "10:30 AM"
  showReadReceipt: z.boolean().optional().default(true),
});

export type WhatsAppMessage = z.infer<typeof WhatsAppMessageSchema>;

/**
 * WhatsApp chat content block schema
 */
export const WhatsAppChatBlockSchema = z.object({
  type: z.literal('whatsapp-chat'),
  title: z.string().min(1).max(100).optional(), // Chat title/header override
  person1: WhatsAppParticipantSchema, // "You" - sender (right side, green bubbles)
  person2: WhatsAppParticipantSchema, // Other person (left side, white bubbles)
  messages: z.array(WhatsAppMessageSchema).min(1).max(50), // Up to 50 messages supported
  showTypingIndicator: z.boolean().optional().default(true), // Show typing before first message
  lastSeen: z.string().max(50).optional(), // e.g., "last seen today at 10:30 AM"
}).merge(BlockCustomizationSchema);

export type WhatsAppChatBlock = z.infer<typeof WhatsAppChatBlockSchema>;

// ============================================================================
// MOTIVATIONAL IMAGE BLOCK SCHEMA (Image with Text Overlay)
// ============================================================================

/**
 * Text overlay schema for motivational images
 */
export const TextOverlaySchema = z.object({
  text: z.string().min(1).max(500),
  position: z.enum(['top', 'center', 'bottom', 'custom']).default('center'),
  customPosition: z.object({
    x: z.number().min(0).max(100).optional(), // Percentage from left
    y: z.number().min(0).max(100).optional(), // Percentage from top
  }).optional(),
  fontSize: z.enum(['small', 'medium', 'large', 'xlarge', 'xxlarge']).default('large'),
  fontWeight: z.enum(['normal', 'bold', 'black']).default('bold'),
  color: z.string().default('#FFFFFF'), // Text color
  shadow: z.boolean().default(true), // Text shadow for readability
  shadowColor: z.string().default('rgba(0,0,0,0.8)'),
  alignment: z.enum(['left', 'center', 'right']).default('center'),
  animation: z.enum([
    'none', 
    'fade', 
    'slide-up', 
    'slide-down', 
    'slide-left', 
    'slide-right',
    'zoom',
    'typewriter',
    'reveal'
  ]).default('fade'),
  animationDelay: z.number().min(0).max(5).default(0), // Delay before text animation starts
  stackOrder: z.number().int().min(0).max(10).optional(), // Order in stack (0 = top, higher = bottom)
});

export type TextOverlay = z.infer<typeof TextOverlaySchema>;

/**
 * Image animation effect types
 */
export const ImageEffectSchema = z.enum([
  'none',           // No animation
  'fade',           // Simple fade in
  'slide-up',       // Slide from bottom
  'slide-down',     // Slide from top
  'slide-left',     // Slide from right
  'slide-right',    // Slide from left
  'zoom-in',        // Zoom from small to normal
  'zoom-out',       // Zoom from large to normal
  'ken-burns',      // Slow zoom and pan (cinematic)
  'blur',           // Blur to clear
  'rotate',         // Rotate in
  'bounce',         // Bounce in
]);

export type ImageEffect = z.infer<typeof ImageEffectSchema>;

/**
 * Color overlay schema
 */
export const ColorOverlaySchema = z.object({
  enabled: z.boolean().default(false),
  color: z.string().default('#000000'),
  opacity: z.number().min(0).max(1).default(0.4), // 0 = transparent, 1 = solid
  animation: z.enum(['none', 'fade', 'pulse']).default('fade'),
});

export type ColorOverlay = z.infer<typeof ColorOverlaySchema>;

/**
 * Text style types for motivational images
 */
export const TextStyleSchema = z.enum([
  'default',    // Simple fade in with shadow
  'quote',      // Italic with left border
  'typing',     // Typewriter effect
  'words',      // Word by word appearance
  'glow',       // Glowing text effect
  'outline',    // Outlined text (transparent fill)
  'bold-glow',  // Bold with glow
  'shadow',     // Drop shadow effect
]);

export type TextStyle = z.infer<typeof TextStyleSchema>;

/**
 * Motivational image content block schema
 * Simplified: Single text with different style options
 * Audio support: Optional background audio with duration control
 */
export const MotivationalImageBlockSchema = z.object({
  type: z.literal('motivational-image'),
  
  // Image source
  imageSrc: z.string().min(1),
  imageAlt: z.string().max(200).optional(),
  
  // Image animation effect
  imageEffect: ImageEffectSchema.default('fade'),
  imageEffectDuration: z.number().min(0.5).max(5).default(1.5),
  
  // Text (single text field) - optional if you want image+audio only
  text: z.string().min(1).max(500).optional(),
  textStyle: TextStyleSchema.default('default'),
  fontSize: z.enum(['small', 'medium', 'large', 'xlarge', 'xxlarge']).default('xlarge'),
  fontWeight: z.enum(['normal', 'bold', 'black']).default('bold'),
  textColor: z.string().default('#FFFFFF'),
  textAlign: z.enum(['left', 'center', 'right']).default('center'),
  textPosition: z.enum(['top', 'center', 'bottom']).default('center'),
  textAnimationDelay: z.number().min(0).max(5).default(0.3),
  
  // Optional color overlay
  colorOverlay: ColorOverlaySchema.optional(),
  
  // Optional background color
  backgroundColor: z.string().default('#000000'),
  
  // Image fit options
  imageFit: z.enum(['cover', 'contain', 'fill']).default('cover'),
  imagePosition: z.enum(['center', 'top', 'bottom', 'left', 'right']).default('center'),
  
  // Audio support (optional)
  audioSrc: z.string().optional(), // URL to mp3 audio file
  audioVolume: z.number().min(0).max(1).default(0.7), // Volume level (0-1)
  duration: z.number().min(1).max(120).optional(), // Optional duration override in seconds
}).merge(BlockCustomizationSchema);

export type MotivationalImageBlock = z.infer<typeof MotivationalImageBlockSchema>;

// ============================================================================
// NEW ADVANCED BLOCK SCHEMAS
// ============================================================================

/**
 * Counter Block Schema - Animated counting numbers
 */
export const CounterBlockSchema = z.object({
  type: z.literal('counter'),
  label: z.string().max(100),
  from: z.number().default(0),
  to: z.number().default(100),
  duration: z.number().min(1).max(10).default(3),
  prefix: z.string().max(20).optional(),
  suffix: z.string().max(20).optional(),
  decimals: z.number().min(0).max(5).default(0),
  color: z.string().default('#3B82F6'),
  animationStyle: z.enum(['linear', 'easeOut', 'easeInOut', 'bounce']).default('easeOut'),
}).merge(BlockCustomizationSchema);

export type CounterBlock = z.infer<typeof CounterBlockSchema>;

/**
 * Progress Bar Block Schema
 */
export const ProgressBarBlockSchema = z.object({
  type: z.literal('progress-bar'),
  label: z.string().max(100).optional(),
  value: z.number().min(0).max(100).default(75),
  color: z.string().default('#10B981'),
  backgroundColor: z.string().default('#1F2937'),
  height: z.enum(['small', 'medium', 'large']).default('medium'),
  showPercentage: z.boolean().default(true),
  animated: z.boolean().default(true),
  stripes: z.boolean().default(false),
}).merge(BlockCustomizationSchema);

export type ProgressBarBlock = z.infer<typeof ProgressBarBlockSchema>;

/**
 * QR Code Block Schema
 */
export const QRCodeBlockSchema = z.object({
  type: z.literal('qr-code'),
  data: z.string().min(1).max(500),
  title: z.string().max(100).optional(),
  subtitle: z.string().max(200).optional(),
  size: z.enum(['small', 'medium', 'large']).default('medium'),
  fgColor: z.string().default('#000000'),
  bgColor: z.string().default('#FFFFFF'),
}).merge(BlockCustomizationSchema);

export type QRCodeBlock = z.infer<typeof QRCodeBlockSchema>;

/**
 * Video/GIF Block Schema
 */
export const VideoBlockSchema = z.object({
  type: z.literal('video'),
  src: z.string().min(1),
  poster: z.string().optional(),
  autoPlay: z.boolean().default(true),
  loop: z.boolean().default(false),
  muted: z.boolean().default(true),
  controls: z.boolean().default(false),
  caption: z.string().max(200).optional(),
}).merge(BlockCustomizationSchema);

export type VideoBlock = z.infer<typeof VideoBlockSchema>;

/**
 * Avatar Grid Block Schema
 */
export const AvatarGridBlockSchema = z.object({
  type: z.literal('avatar-grid'),
  title: z.string().max(100).optional(),
  subtitle: z.string().max(200).optional(),
  avatars: z.array(z.object({
    name: z.string().max(50),
    role: z.string().max(100).optional(),
    image: z.string().optional(),
  })).min(1).max(12),
  layout: z.enum(['grid', 'carousel', 'stacked']).default('grid'),
  columns: z.number().min(2).max(6).default(3),
}).merge(BlockCustomizationSchema);

export type AvatarGridBlock = z.infer<typeof AvatarGridBlockSchema>;

/**
 * Social Stats Block Schema
 */
export const SocialStatsBlockSchema = z.object({
  type: z.literal('social-stats'),
  platform: z.enum(['twitter', 'instagram', 'youtube', 'tiktok', 'linkedin', 'facebook']),
  username: z.string().max(50),
  followers: z.number().min(0),
  posts: z.number().min(0).optional(),
  likes: z.number().min(0).optional(),
  verified: z.boolean().default(false),
  showGrowth: z.boolean().default(true),
  growthPercentage: z.number().optional(),
}).merge(BlockCustomizationSchema);

export type SocialStatsBlock = z.infer<typeof SocialStatsBlockSchema>;

/**
 * CTA Button Block Schema
 */
export const CTABlockSchema = z.object({
  type: z.literal('cta'),
  text: z.string().max(50),
  description: z.string().max(200).optional(),
  buttonStyle: z.enum(['primary', 'secondary', 'outline', 'ghost']).default('primary'),
  color: z.string().default('#3B82F6'),
  size: z.enum(['small', 'medium', 'large']).default('large'),
  icon: z.string().optional(),
  pulse: z.boolean().default(true),
}).merge(BlockCustomizationSchema);

export type CTABlock = z.infer<typeof CTABlockSchema>;

/**
 * Gradient Text Block Schema
 */
export const GradientTextBlockSchema = z.object({
  type: z.literal('gradient-text'),
  text: z.string().max(200),
  gradient: z.array(z.string()).min(2).max(5).default(['#3B82F6', '#8B5CF6']),
  angle: z.number().min(0).max(360).default(45),
  animate: z.boolean().default(true),
  animationSpeed: z.number().min(1).max(10).default(3),
  fontSize: z.enum(['small', 'medium', 'large', 'xlarge', 'xxlarge']).default('xlarge'),
  fontWeight: z.enum(['normal', 'bold', 'black']).default('bold'),
}).merge(BlockCustomizationSchema);

export type GradientTextBlock = z.infer<typeof GradientTextBlockSchema>;

/**
 * Animated Background Block Schema
 */
export const AnimatedBackgroundBlockSchema = z.object({
  type: z.literal('animated-bg'),
  style: z.enum(['particles', 'waves', 'gradient', 'noise', 'geometric', 'aurora']),
  primaryColor: z.string().default('#3B82F6'),
  secondaryColor: z.string().default('#8B5CF6'),
  speed: z.number().min(0.5).max(5).default(1),
  intensity: z.number().min(0.1).max(1).default(0.5),
  overlay: z.boolean().default(false),
  overlayOpacity: z.number().min(0).max(1).default(0.3),
}).merge(BlockCustomizationSchema);

export type AnimatedBackgroundBlock = z.infer<typeof AnimatedBackgroundBlockSchema>;

/**
 * Countdown Timer Block Schema
 */
export const CountdownBlockSchema = z.object({
  type: z.literal('countdown'),
  title: z.string().max(100).optional(),
  targetDate: z.string().optional(), // ISO date string
  days: z.number().min(0).optional(),
  hours: z.number().min(0).max(23).optional(),
  minutes: z.number().min(0).max(59).optional(),
  seconds: z.number().min(0).max(59).optional(),
  style: z.enum(['modern', 'classic', 'minimal', 'flip']).default('modern'),
  color: z.string().default('#FFFFFF'),
  showLabels: z.boolean().default(true),
}).merge(BlockCustomizationSchema);

export type CountdownBlock = z.infer<typeof CountdownBlockSchema>;

/**
 * Union type for all content blocks
 */
export const ContentBlockSchema = z.discriminatedUnion('type', [
  StatBlockSchema,
  ComparisonBlockSchema,
  TextBlockSchema,
  ImageBlockSchema,
  QuoteBlockSchema,
  ListBlockSchema,
  TimelineBlockSchema,
  CalloutBlockSchema,
  IconListBlockSchema,
  LineChartBlockSchema,
  PieChartBlockSchema,
  CodeBlockSchema,
  TestimonialBlockSchema,
  WhatsAppChatBlockSchema,
  MotivationalImageBlockSchema,
  // New blocks
  CounterBlockSchema,
  ProgressBarBlockSchema,
  QRCodeBlockSchema,
  VideoBlockSchema,
  AvatarGridBlockSchema,
  SocialStatsBlockSchema,
  CTABlockSchema,
  GradientTextBlockSchema,
  AnimatedBackgroundBlockSchema,
  CountdownBlockSchema,
]);

export type ContentBlock = z.infer<typeof ContentBlockSchema>;

/**
 * Complete video input schema
 */
export const VideoInputSchema = z.object({
  videoMeta: VideoMetaSchema,
  contentBlocks: z.array(ContentBlockSchema).min(1).max(20),
});

export type VideoInput = z.infer<typeof VideoInputSchema>;

// ============================================================================
// INTELLIGENCE LAYER - AI Decision Schemas
// ============================================================================

/**
 * Motion profile types
 */
export const MotionProfileSchema = z.enum(['subtle', 'dynamic', 'energetic']);
export type MotionProfile = z.infer<typeof MotionProfileSchema>;

/**
 * Animation sequence phases
 */
export const AnimationPhaseSchema = z.object({
  enter: z.number().min(0).max(5),    // Duration in seconds
  hold: z.number().min(0).max(55),    // Duration in seconds (increased for long chats)
  exit: z.number().min(0).max(5),     // Duration in seconds
});

export type AnimationPhase = z.infer<typeof AnimationPhaseSchema>;

/**
 * AI Decision output for a single content block
 */
export const AIDecisionSchema = z.object({
  componentId: z.string(),
  motionProfile: MotionProfileSchema,
  duration: z.number().min(1).max(60), // Increased max for long chat conversations
  animation: AnimationPhaseSchema.optional(),
  props: z.record(z.unknown()).optional(),
});

export type AIDecision = z.infer<typeof AIDecisionSchema>;

/**
 * Complete video plan from AI
 */
export const VideoPlanSchema = z.object({
  decisions: z.array(AIDecisionSchema),
  totalDuration: z.number(),
  suggestedTransitions: z.array(z.enum(['fade', 'slide', 'zoom', 'wipe'])).optional(),
});

export type VideoPlan = z.infer<typeof VideoPlanSchema>;

// ============================================================================
// RENDER LAYER - Component Registry
// ============================================================================

/**
 * Component registry entry
 */
export const ComponentRegistryEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  supportedTypes: z.array(z.string()),
  defaultDuration: z.number(),
  defaultProps: z.record(z.unknown()).optional(),
});

export type ComponentRegistryEntry = z.infer<typeof ComponentRegistryEntrySchema>;

/**
 * Available component IDs
 */
export const COMPONENT_IDS = {
  INTRO: 'intro',
  OUTRO: 'outro',
  STAT: 'stat-scene',
  COMPARISON: 'comparison-scene',
  TEXT: 'text-scene',
  QUOTE: 'quote-scene',
  IMAGE: 'image-scene',
  LIST: 'list-scene',
  TIMELINE: 'timeline-scene',
  CALLOUT: 'callout-scene',
  ICON_LIST: 'icon-list-scene',
  LINE_CHART: 'line-chart-scene',
  PIE_CHART: 'pie-chart-scene',
  CODE: 'code-scene',
  TESTIMONIAL: 'testimonial-scene',
  WHATSAPP_CHAT: 'whatsapp-chat-scene',
  MOTIVATIONAL_IMAGE: 'motivational-image-scene',
  // New components
  COUNTER: 'counter-scene',
  PROGRESS_BAR: 'progress-bar-scene',
  QR_CODE: 'qr-code-scene',
  VIDEO: 'video-scene',
  AVATAR_GRID: 'avatar-grid-scene',
  SOCIAL_STATS: 'social-stats-scene',
  CTA: 'cta-scene',
  GRADIENT_TEXT: 'gradient-text-scene',
  ANIMATED_BG: 'animated-bg-scene',
  COUNTDOWN: 'countdown-scene',
} as const;

export type ComponentId = typeof COMPONENT_IDS[keyof typeof COMPONENT_IDS];

/**
 * Mapping of content types to supported components
 */
export const TYPE_TO_COMPONENT_MAP: Record<string, ComponentId[]> = {
  stat: [COMPONENT_IDS.STAT],
  comparison: [COMPONENT_IDS.COMPARISON],
  text: [COMPONENT_IDS.TEXT],
  image: [COMPONENT_IDS.IMAGE],
  quote: [COMPONENT_IDS.QUOTE],
  list: [COMPONENT_IDS.LIST],
  timeline: [COMPONENT_IDS.TIMELINE],
  callout: [COMPONENT_IDS.CALLOUT],
  'icon-list': [COMPONENT_IDS.ICON_LIST],
  'line-chart': [COMPONENT_IDS.LINE_CHART],
  'pie-chart': [COMPONENT_IDS.PIE_CHART],
  code: [COMPONENT_IDS.CODE],
  testimonial: [COMPONENT_IDS.TESTIMONIAL],
  'whatsapp-chat': [COMPONENT_IDS.WHATSAPP_CHAT],
  'motivational-image': [COMPONENT_IDS.MOTIVATIONAL_IMAGE],
  // New block types
  counter: [COMPONENT_IDS.COUNTER],
  'progress-bar': [COMPONENT_IDS.PROGRESS_BAR],
  'qr-code': [COMPONENT_IDS.QR_CODE],
  video: [COMPONENT_IDS.VIDEO],
  'avatar-grid': [COMPONENT_IDS.AVATAR_GRID],
  'social-stats': [COMPONENT_IDS.SOCIAL_STATS],
  cta: [COMPONENT_IDS.CTA],
  'gradient-text': [COMPONENT_IDS.GRADIENT_TEXT],
  'animated-bg': [COMPONENT_IDS.ANIMATED_BG],
  countdown: [COMPONENT_IDS.COUNTDOWN],
};

