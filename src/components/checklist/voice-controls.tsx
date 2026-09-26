"use client";

import { Button } from "@/components/ui/button";
import { VOICE_LANGUAGES } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Mic, MicOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface SpeechAlternative {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
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
  lang: string;
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

const LANG_KEY = "prenit-voice-lang-id";
const DEFAULT_LANG_ID = "hi";

function langCodeFromId(id: string) {
  return VOICE_LANGUAGES.find((item) => item.id === id)?.code || "hi-IN";
}

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function readSavedLangId(): string {
  if (typeof window === "undefined") return DEFAULT_LANG_ID;
  const saved = window.localStorage.getItem(LANG_KEY);
  return VOICE_LANGUAGES.some((item) => item.id === saved) ? saved! : DEFAULT_LANG_ID;
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
      return "No speech heard. Keep holding Voice and speak clearly.";
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
  const [langId, setLangId] = useState(DEFAULT_LANG_ID);
  const [liveText, setLiveText] = useState("");

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  const langRef = useRef(langCodeFromId(DEFAULT_LANG_ID));
  const wantedRef = useRef(false);
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
    langRef.current = langCodeFromId(langId);
  }, [langId]);

  useEffect(() => {
    setSupported(Boolean(getSpeechRecognitionCtor()));
    setLangId(readSavedLangId());
  }, []);

  const clearRestartTimer = () => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  };

  const destroyRecognition = () => {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
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

  const startEngine = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor || !wantedRef.current) return;

    destroyRecognition();

    const recognition = new Ctor();
    // Single-shot + restart is more reliable on Android Chrome than continuous=true
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = langRef.current;

    recognition.onstart = () => {
      setError("");
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
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

      setLiveText(interim || sessionFinalRef.current);
      onChangeRef.current(joinRemarks(baseTextRef.current, joinRemarks(sessionFinalRef.current, interim)));
    };

    recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
      const code = event.error || "unknown";
      if (code === "aborted" || code === "no-speech") return;
      if (code === "network") {
        setError(errorMessage(code));
        return;
      }
      wantedRef.current = false;
      setIsListening(false);
      setError(errorMessage(code));
    };

    recognition.onend = () => {
      setLiveText("");
      if (!wantedRef.current) {
        setIsListening(false);
        return;
      }

      clearRestartTimer();
      restartTimerRef.current = setTimeout(() => {
        if (!wantedRef.current) {
          setIsListening(false);
          return;
        }
        try {
          startEngine();
        } catch {
          wantedRef.current = false;
          setIsListening(false);
        }
      }, 180);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      restartTimerRef.current = setTimeout(() => {
        if (!wantedRef.current) return;
        try {
          recognition.start();
        } catch {
          wantedRef.current = false;
          setIsListening(false);
          setError("Could not start voice. Tap Voice again.");
        }
      }, 280);
    }
  }, []);

  useEffect(() => {
    return () => {
      wantedRef.current = false;
      clearRestartTimer();
      destroyRecognition();
    };
  }, []);

  const stopListening = useCallback(() => {
    wantedRef.current = false;
    clearRestartTimer();
    setIsListening(false);
    setLiveText("");
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
  }, []);

  const startListening = useCallback(() => {
    setError("");
    setLiveText("");

    if (typeof window !== "undefined" && !window.isSecureContext) {
      setError("Voice needs HTTPS. Open the Vercel https:// link on the phone.");
      return;
    }

    if (!getSpeechRecognitionCtor()) {
      setSupported(false);
      setError("Voice not supported here. Use Chrome or Edge.");
      return;
    }

    baseTextRef.current = valueRef.current;
    sessionFinalRef.current = "";
    wantedRef.current = true;
    setIsListening(true);
    startEngine();
  }, [startEngine]);

  const toggleListening = useCallback(() => {
    if (wantedRef.current || isListening) {
      stopListening();
      return;
    }
    startListening();
  }, [isListening, startListening, stopListening]);

  const changeLang = (id: string) => {
    setLangId(id);
    langRef.current = langCodeFromId(id);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LANG_KEY, id);
    }
    if (wantedRef.current) {
      startEngine();
    }
  };

  if (!supported) {
    return (
      <p className="text-xs text-slate-500">
        Voice not supported here — use Chrome/Edge, or type remarks.
      </p>
    );
  }

  return (
    <div className={cn(compact ? "space-y-2" : "space-y-3", className)}>
      <div className="flex flex-wrap items-center gap-2">
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
        {VOICE_LANGUAGES.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => changeLang(option.id)}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-semibold",
              langId === option.id
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

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
