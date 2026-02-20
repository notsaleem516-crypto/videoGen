// ============================================================================
// WHATSAPP MESSAGE SOUNDS - Sound Configuration
// ============================================================================

/**
 * Sound configuration for WhatsApp chat
 * Uses Remotion's built-in tone generation for reliable audio in both preview and render
 */

/**
 * Sound configuration for WhatsApp chat
 */
export interface SoundConfig {
  enabled: boolean;
  volume: number; // 0 to 1
  // Tone frequencies for different sounds (in Hz)
  sentToneFrequency?: number;    // Higher pitch for sent messages
  receivedToneFrequency?: number; // Lower pitch for received messages
}

export const DEFAULT_SOUND_CONFIG: SoundConfig = {
  enabled: true,
  volume: 0.5,
  sentToneFrequency: 800,     // Higher pitch - like a sent confirmation
  receivedToneFrequency: 600, // Lower pitch - like a notification
};

/**
 * Generate a simple beep sound as base64 encoded WAV
 * This creates a short beep sound programmatically
 */
export function generateBeepSound(frequency: number = 800, durationMs: number = 150, volume: number = 0.5): string {
  const sampleRate = 44100;
  const numSamples = Math.floor(sampleRate * (durationMs / 1000));
  const numChannels = 1;
  const bitsPerSample = 16;
  
  // Create the audio data
  const samples = new Int16Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Sine wave with envelope (fade in/out)
    const envelope = Math.sin(Math.PI * i / numSamples); // Simple envelope
    const sample = Math.sin(2 * Math.PI * frequency * t) * envelope * volume * 32767;
    samples[i] = Math.floor(sample);
  }
  
  // Create WAV file
  const dataSize = numSamples * numChannels * (bitsPerSample / 8);
  const headerSize = 44;
  const totalSize = headerSize + dataSize;
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  
  // RIFF header
  view.setUint8(0, 0x52); // R
  view.setUint8(1, 0x49); // I
  view.setUint8(2, 0x46); // F
  view.setUint8(3, 0x46); // F
  view.setUint32(4, totalSize - 8, true); // File size - 8
  view.setUint8(8, 0x57);  // W
  view.setUint8(9, 0x41);  // A
  view.setUint8(10, 0x56); // V
  view.setUint8(11, 0x45); // E
  
  // fmt chunk
  view.setUint8(12, 0x66); // f
  view.setUint8(13, 0x6D); // m
  view.setUint8(14, 0x74); // t
  view.setUint8(15, 0x20); // (space)
  view.setUint32(16, 16, true); // Chunk size
  view.setUint16(20, 1, true);  // Audio format (PCM)
  view.setUint16(22, numChannels, true); // Number of channels
  view.setUint32(24, sampleRate, true);  // Sample rate
  view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true); // Byte rate
  view.setUint16(32, numChannels * (bitsPerSample / 8), true); // Block align
  view.setUint16(34, bitsPerSample, true); // Bits per sample
  
  // data chunk
  view.setUint8(36, 0x64); // d
  view.setUint8(37, 0x61); // a
  view.setUint8(38, 0x74); // t
  view.setUint8(39, 0x61); // a
  view.setUint32(40, dataSize, true); // Data size
  
  // Write audio samples
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    view.setInt16(offset, samples[i], true);
    offset += 2;
  }
  
  // Convert to base64
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return 'data:audio/wav;base64,' + btoa(binary);
}

// Pre-generated sounds
export const MESSAGE_SENT_SOUND = generateBeepSound(800, 120, 0.4);
export const MESSAGE_RECEIVED_SOUND = generateBeepSound(600, 150, 0.4);
export const TYPING_SOUND = generateBeepSound(400, 80, 0.2);
