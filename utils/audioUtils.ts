import { Blob } from '@google/genai';

/**
 * Converts a Float32Array (web audio standard) to a 16-bit PCM ArrayBuffer
 * and returns it as a base64 encoded string wrapped in the GenAI Blob format.
 */
export function createPcmBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    // Clamp values to [-1, 1] before converting to PCM
    const s = Math.max(-1, Math.min(1, data[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return {
    data: arrayBufferToBase64(int16.buffer),
    mimeType: 'audio/pcm;rate=16000',
  };
}

/**
 * Decodes a base64 string into a Uint8Array
 */
export function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Encodes an ArrayBuffer (or Uint8Array) to base64
 */
export function arrayBufferToBase64(buffer: ArrayBufferLike): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Converts raw PCM 16-bit audio data (from Gemini) into an AudioBuffer
 * that the Web Audio API can play.
 */
export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Convert Int16 [-32768, 32767] to Float32 [-1.0, 1.0]
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/**
 * Calculate Root Mean Square (RMS) for visualization
 */
export function calculateRMS(data: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i] * data[i];
  }
  return Math.sqrt(sum / data.length);
}

/**
 * Downsamples audio data from a source sample rate to 16000Hz using linear interpolation.
 */
export function downsampleTo16k(input: Float32Array, inputSampleRate: number): Float32Array {
  if (inputSampleRate === 16000) {
    return input;
  }
  
  if (input.length === 0) {
    return new Float32Array(0);
  }

  const ratio = inputSampleRate / 16000;
  const newLength = Math.ceil(input.length / ratio);
  
  if (newLength <= 0) {
     return new Float32Array(0);
  }

  const result = new Float32Array(newLength);

  for (let i = 0; i < newLength; i++) {
    const index = i * ratio;
    const floor = Math.floor(index);
    const ceil = Math.ceil(index);
    const weight = index - floor;
    
    // Bounds checking
    const s1 = input[floor] || 0;
    const s2 = input[ceil] || input[floor] || 0; 
    
    // Linear interpolation
    result[i] = s1 * (1 - weight) + s2 * weight;
  }
  
  return result;
}