"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Mic, MicOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface SpeechAlternative {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0?: SpeechAlternative;
  item?: (index: number) => SpeechAlternative;
}

interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
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

let stopActiveMic: (() => void) | null = null;

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

function readTranscript(result: SpeechRecognitionResultLike): string {
  const alternative =
    result[0] || (typeof result.item === "function" ? result.item(0) : undefined);
  return (alternative?.transcript || "").replace(/\s+/g, " ").trim();
}

function errorMessage(code: string): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Mic blocked. Allow microphone for this site and tap Voice again.";
    case "no-speech":
      return "";
    case "audio-capture":
      return "No microphone found. Check device settings.";
    case "network":
      return "Voice needs internet. Check data/Wi‑Fi and try again.";
    case "aborted":
      return "";
    default:
      return "Voice failed. Use Chrome or Edge, then tap Voice again.";
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
  const [liveText, setLiveText] = useState("");

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  const wantedRef = useRef(false);
  const readyRef = useRef(false);
  const baseTextRef = useRef("");
  const sessionFinalRef = useRef("");

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    valueRef.current = value;
    if (!wantedRef.current && !value.trim()) {
      baseTextRef.current = "";
      sessionFinalRef.current = "";
    }
    if (wantedRef.current && !value.trim()) {
      baseTextRef.current = "";
      sessionFinalRef.current = "";
      setLiveText("");
    }
  }, [value]);

  useEffect(() => {
    setSupported(Boolean(getSpeechRecognitionCtor()));
  }, []);

  const destroyRecognition = () => {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    readyRef.current = false;
    if (!recognition) return;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    recognition.onstart = null;
    try {
      recognition.abort();
    } catch {
      // ignore
    }
  };

  const publish = (interim = "") => {
    const spoken = joinRemarks(sessionFinalRef.current, interim);
    setLiveText(interim || sessionFinalRef.current);
    onChangeRef.current(joinRemarks(baseTextRef.current, spoken));
  };

  const stopListening = useCallback(() => {
    wantedRef.current = false;
    readyRef.current = false;
    setIsListening(false);
    setLiveText("");
    if (stopActiveMic === stopListening) stopActiveMic = null;
    destroyRecognition();
  }, []);

  const startListening = useCallback(() => {
    setError("");
    setLiveText("");

    if (typeof window !== "undefined" && !window.isSecureContext) {
      setError("Voice needs HTTPS. Open the Vercel https:// link on the phone.");
      return;
    }

    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setSupported(false);
      setError("Voice not supported here. Use Chrome or Edge.");
      return;
    }

    if (stopActiveMic && stopActiveMic !== stopListening) {
      stopActiveMic();
    }

    destroyRecognition();
    baseTextRef.current = valueRef.current.trim();
    sessionFinalRef.current = "";
    readyRef.current = false;
    wantedRef.current = true;
    setIsListening(true);
    stopActiveMic = stopListening;

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      if (recognitionRef.current !== recognition) return;
      readyRef.current = true;
      sessionFinalRef.current = "";
      setError("");
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      if (!wantedRef.current || !readyRef.current || recognitionRef.current !== recognition) {
        return;
      }

      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = readTranscript(result);
        if (!transcript) continue;
        if (result.isFinal) {
          sessionFinalRef.current = joinRemarks(sessionFinalRef.current, transcript);
        } else {
          interim = transcript;
        }
      }
      publish(interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
      const code = event.error || "unknown";
      if (code === "aborted" || code === "no-speech") return;
      if (code === "network") {
        setError(errorMessage(code));
        return;
      }
      setError(errorMessage(code));
      stopListening();
    };

    recognition.onend = () => {
      if (!wantedRef.current || recognitionRef.current !== recognition) {
        if (!wantedRef.current) setIsListening(false);
        return;
      }
      try {
        recognition.start();
      } catch {
        stopListening();
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      setError("Could not start voice. Tap Voice again.");
      stopListening();
    }
  }, [stopListening]);

  useEffect(() => {
    return () => {
      wantedRef.current = false;
      if (stopActiveMic === stopListening) stopActiveMic = null;
      destroyRecognition();
    };
  }, [stopListening]);

  const toggleListening = useCallback(() => {
    if (wantedRef.current || isListening) {
      stopListening();
      return;
    }
    startListening();
  }, [isListening, startListening, stopListening]);

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
          {liveText ? liveText : "Listening… speak now, then tap Stop"}
        </p>
      )}

      {error ? <p className="text-xs font-medium text-orange-600">{error}</p> : null}
    </div>
  );
}
