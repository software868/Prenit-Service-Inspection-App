"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Mic, MicOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface SpeechRecognitionResult {
  isFinal: boolean;
  0: { transcript: string };
  length: number;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList & Iterable<SpeechRecognitionResult>;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

interface VoiceControlsProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  compact?: boolean;
}

const DEFAULT_LANG = "en-IN";

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function joinRemarks(base: string, spoken: string): string {
  const trimmedBase = base.trim();
  const trimmedSpoken = spoken.trim();
  if (!trimmedBase) return trimmedSpoken;
  if (!trimmedSpoken) return trimmedBase;
  return `${trimmedBase} ${trimmedSpoken}`;
}

function errorMessage(code: string): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone permission blocked. Allow mic for this site and try again.";
    case "no-speech":
      return "No speech heard. Tap Voice and speak again.";
    case "audio-capture":
      return "No microphone found. Check device settings.";
    case "network":
      return "Voice needs internet (Chrome speech service). Check connection.";
    case "aborted":
      return "";
    default:
      return "Voice failed. Use Chrome/Edge on HTTPS, or type the remark.";
  }
}

export function VoiceControls({
  value,
  onChange,
  className,
  compact = false,
}: VoiceControlsProps) {
  const [isListening, setIsListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [error, setError] = useState("");

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  const isListeningRef = useRef(false);
  const baseTextRef = useRef("");
  const sessionFinalRef = useRef("");
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    setSupported(Boolean(getSpeechRecognitionCtor()));
  }, []);

  const clearRestartTimer = () => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  };

  const ensureRecognition = useCallback(() => {
    if (recognitionRef.current) return recognitionRef.current;

    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setSupported(false);
      return null;
    }

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = DEFAULT_LANG;

    recognition.onstart = () => {
      setError("");
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? "";
        if (!transcript) continue;

        if (result.isFinal) {
          sessionFinalRef.current += transcript;
          if (!sessionFinalRef.current.endsWith(" ")) {
            sessionFinalRef.current += " ";
          }
        } else {
          interim += transcript;
        }
      }

      const spoken = `${sessionFinalRef.current}${interim}`.trim();
      onChangeRef.current(joinRemarks(baseTextRef.current, spoken));
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const code = event.error || "unknown";
      if (code === "aborted" || code === "no-speech") {
        // Keep session alive for continuous listening; browser may pause briefly
        if (code === "no-speech" && isListeningRef.current) {
          setError(errorMessage(code));
        }
        return;
      }

      isListeningRef.current = false;
      setIsListening(false);
      setError(errorMessage(code));
    };

    recognition.onend = () => {
      clearRestartTimer();

      if (!isListeningRef.current) {
        setIsListening(false);
        return;
      }

      // Browsers often end after a pause; restart after a short delay
      restartTimerRef.current = setTimeout(() => {
        if (!isListeningRef.current || !recognitionRef.current) {
          setIsListening(false);
          return;
        }
        try {
          recognitionRef.current.start();
        } catch {
          isListeningRef.current = false;
          setIsListening(false);
        }
      }, 250);
    };

    recognitionRef.current = recognition;
    return recognition;
  }, []);

  useEffect(() => {
    return () => {
      isListeningRef.current = false;
      clearRestartTimer();
      const recognition = recognitionRef.current;
      if (recognition) {
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        recognition.onstart = null;
        try {
          recognition.abort();
        } catch {
          // ignore
        }
      }
      recognitionRef.current = null;
    };
  }, []);

  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    clearRestartTimer();
    setIsListening(false);
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
  }, []);

  const startListening = useCallback(async () => {
    setError("");

    if (!window.isSecureContext) {
      setError("Voice needs HTTPS. Open the Vercel https:// link.");
      return;
    }

    const recognition = ensureRecognition();
    if (!recognition) {
      setError("Voice not supported in this browser. Use Chrome or Edge.");
      return;
    }

    // Request mic permission first — required on many mobile browsers in production
    if (navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      } catch {
        setError("Microphone permission blocked. Allow mic for this site.");
        return;
      }
    }

    baseTextRef.current = valueRef.current;
    sessionFinalRef.current = "";
    recognition.lang = DEFAULT_LANG;
    isListeningRef.current = true;
    setIsListening(true);

    try {
      recognition.start();
    } catch {
      // Already started — restart cleanly
      try {
        recognition.stop();
      } catch {
        // ignore
      }
      setTimeout(() => {
        try {
          recognition.start();
          isListeningRef.current = true;
          setIsListening(true);
        } catch {
          isListeningRef.current = false;
          setIsListening(false);
          setError("Could not start voice. Tap Voice again.");
        }
      }, 300);
    }
  }, [ensureRecognition]);

  const toggleListening = useCallback(() => {
    if (isListeningRef.current) {
      stopListening();
    } else {
      void startListening();
    }
  }, [startListening, stopListening]);

  if (!supported) {
    return (
      <p className="text-xs text-slate-500">
        Voice not supported here — use Chrome/Edge, or type remarks.
      </p>
    );
  }

  return (
    <div className={cn(compact ? "space-y-2" : "space-y-3", className)}>
      <Button
        type="button"
        variant={isListening ? "danger" : "outline"}
        size="sm"
        onClick={toggleListening}
      >
        {isListening ? (
          <>
            <MicOff className="h-4 w-4" />
            Stop
          </>
        ) : (
          <>
            <Mic className="h-4 w-4" />
            Voice
          </>
        )}
      </Button>

      {isListening && (
        <p className="flex items-center gap-2 text-xs font-medium text-orange-600">
          <span className="h-2 w-2 animate-pulse rounded-full bg-orange-500" />
          Listening… tap Stop when done
        </p>
      )}

      {error ? <p className="text-xs font-medium text-orange-600">{error}</p> : null}
    </div>
  );
}
