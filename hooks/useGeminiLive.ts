import { useState, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage } from '@google/genai';
import { ConnectionState } from '../types';
import { GEMINI_MODEL, SAMPLE_RATE_INPUT, SAMPLE_RATE_OUTPUT, SYSTEM_INSTRUCTION } from '../constants';
import { createPcmBlob, decodeBase64, decodeAudioData, calculateRMS, downsampleTo16k } from '../utils/audioUtils';

interface UseGeminiLiveProps {
  onVolumeChange: (inputVol: number, outputVol: number) => void;
  onError: (error: string) => void;
}

export const useGeminiLive = ({ onVolumeChange, onError }: UseGeminiLiveProps) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  
  // Dual Audio Contexts
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  
  // Audio Nodes
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Playback Timing & Control
  const nextStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const pitchRef = useRef<number>(0); // Store pitch in cents
  
  // Gemini Session
  const sessionPromiseRef = useRef<Promise<any> | null>(null);

  const setPitch = useCallback((cents: number) => {
    pitchRef.current = cents;
    // Apply to all currently playing sources for real-time effect
    if (outputContextRef.current) {
      const now = outputContextRef.current.currentTime;
      audioSourcesRef.current.forEach(source => {
        try {
          // Smooth transition over 100ms
          source.detune.setTargetAtTime(cents, now, 0.1);
        } catch (e) {
          // Source might have stopped already
        }
      });
    }
  }, []);

  const cleanupAudio = useCallback(() => {
    // 1. Stop all playback sources
    audioSourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    audioSourcesRef.current.clear();

    // 2. Disconnect and clean Input Nodes
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }
    if (inputSourceRef.current) {
      inputSourceRef.current.disconnect();
      inputSourceRef.current = null;
    }
    
    // 3. Stop Microphone Stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // 4. Close Contexts
    if (inputContextRef.current) {
      inputContextRef.current.close();
      inputContextRef.current = null;
    }
    if (outputContextRef.current) {
      outputContextRef.current.close();
      outputContextRef.current = null;
    }

    // Reset State
    nextStartTimeRef.current = 0;
  }, []);

  const disconnect = useCallback(async () => {
    cleanupAudio();
    setConnectionState(ConnectionState.DISCONNECTED);
  }, [cleanupAudio]);

  const connect = useCallback(async () => {
    try {
      if (!process.env.API_KEY) {
        throw new Error("API Key not found in environment variables.");
      }

      setConnectionState(ConnectionState.CONNECTING);

      // --- 1. Audio Setup (Dual Context) ---
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;

      // Input Context: Try 16kHz, fallback to system default if not supported (common on Safari/Windows)
      let inputCtx: AudioContext;
      try {
        inputCtx = new AudioContextClass({ sampleRate: SAMPLE_RATE_INPUT });
      } catch (e) {
        console.warn("Could not create 16kHz context, falling back to default.", e);
        inputCtx = new AudioContextClass();
      }
      
      // Output Context: 24kHz (Better Quality for Playback)
      let outputCtx: AudioContext;
      try {
        outputCtx = new AudioContextClass({ sampleRate: SAMPLE_RATE_OUTPUT });
      } catch (e) {
        outputCtx = new AudioContextClass();
      }

      // CRITICAL: Explicitly resume contexts to prevent "suspended" state issues
      await inputCtx.resume();
      await outputCtx.resume();

      inputContextRef.current = inputCtx;
      outputContextRef.current = outputCtx;

      // --- 2. Microphone Access ---
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          // Low latency constraint
          latency: 0.01 
        } as any
      });
      streamRef.current = stream;

      // --- 3. Gemini Initialization ---
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const sessionPromise = ai.live.connect({
        model: GEMINI_MODEL,
        config: {
          // Use string literal 'AUDIO' to avoid Enum import issues at runtime
          responseModalities: ['AUDIO'] as any, 
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: SYSTEM_INSTRUCTION,
        },
        callbacks: {
          onopen: () => {
            console.log("Gemini Live Connected");
            setConnectionState(ConnectionState.CONNECTED);
            
            // --- 4. Start Audio Pipeline (Inside onopen to avoid sending data before ready) ---
            if (!inputContextRef.current || !streamRef.current) return;

            const inputSource = inputContextRef.current.createMediaStreamSource(streamRef.current);
            inputSourceRef.current = inputSource;

            // ScriptProcessor
            // Buffer size 2048 is ~42ms at 48kHz.
            const processor = inputContextRef.current.createScriptProcessor(2048, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              
              // 1. Calculate Input Volume (visuals)
              const rms = calculateRMS(inputData);
              onVolumeChange(rms, 0); 

              // 2. Resample to 16kHz if necessary
              const currentRate = inputContextRef.current?.sampleRate || SAMPLE_RATE_INPUT;
              const downsampledData = downsampleTo16k(inputData, currentRate);
              
              if (downsampledData.length === 0) return;

              // 3. Create Blob (16-bit PCM, 16kHz)
              const pcmBlob = createPcmBlob(downsampledData);
              
              // 4. Send to Gemini
              // Using the promise ensures we don't send to a closed session
              sessionPromise.then(session => {
                try {
                  session.sendRealtimeInput({ media: pcmBlob });
                } catch (sendErr) {
                   // Ignore send errors if session is closing
                }
              }).catch(err => {
                // Squelch errors for dropped packets during teardown
              });
            };

            inputSource.connect(processor);
            processor.connect(inputContextRef.current.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (!outputContextRef.current) return;

            // Handle Audio Response
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              const ctx = outputContextRef.current;
              
              // Decode Audio
              const audioData = decodeBase64(base64Audio);
              const audioBuffer = await decodeAudioData(audioData, ctx, SAMPLE_RATE_OUTPUT);

              // Calculate Output Volume
              const rms = calculateRMS(audioBuffer.getChannelData(0));
              onVolumeChange(0, rms);

              // Schedule Playback
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              
              // Apply current pitch
              source.detune.value = pitchRef.current;

              // Timing Logic: Low Latency Scheduling
              const currentTime = ctx.currentTime;
              
              // If we fell behind, jump ahead immediately.
              // Adding a tiny offset (0.005s) prevents "start time in past" glitches
              if (nextStartTimeRef.current < currentTime) {
                nextStartTimeRef.current = currentTime + 0.005;
              }
              
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;

              // Cleanup source when done
              audioSourcesRef.current.add(source);
              source.onended = () => {
                audioSourcesRef.current.delete(source);
              };
            }

            // Handle Interruption
            if (message.serverContent?.interrupted) {
               audioSourcesRef.current.forEach(src => src.stop());
               audioSourcesRef.current.clear();
               nextStartTimeRef.current = outputContextRef.current?.currentTime || 0;
            }
          },
          onclose: () => {
             console.log("Gemini Live Closed");
             setConnectionState(ConnectionState.DISCONNECTED);
             cleanupAudio();
          },
          onerror: (err: any) => {
            console.error("Gemini Live Error:", err);
            setConnectionState(ConnectionState.ERROR);
            
            // Extract useful error message
            let errorMessage = "Connection error.";
            if (err.message) errorMessage = err.message;
            else if (err.toString() === "[object Event]") errorMessage = "WebSocket Error: Check API Key & Network.";
            else errorMessage = JSON.stringify(err);

            onError(errorMessage);
            cleanupAudio();
          }
        }
      });

      sessionPromiseRef.current = sessionPromise;

    } catch (err: any) {
      console.error("Setup Failed", err);
      setConnectionState(ConnectionState.ERROR);
      onError(err.message || "Failed to initialize audio. Check permissions.");
      cleanupAudio();
    }
  }, [onVolumeChange, onError, cleanupAudio]);

  return {
    connect,
    disconnect,
    setPitch,
    connectionState
  };
};