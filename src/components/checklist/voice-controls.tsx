"use client";

import { Button } from "@/components/ui/button";
import { VOICE_LANGUAGES } from "@/lib/types";
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

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
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

function joinRemarks(base: string, spoken: string): string {
  const trimmedBase = base.trim();
  const trimmedSpoken = spoken.trim();
  if (!trimmedBase) return trimmedSpoken;
  if (!trimmedSpoken) return trimmedBase;
  return `${trimmedBase} ${trimmedSpoken}`;
}

export function VoiceControls({
  value,
  onChange,
  className,
  compact = false,
}: VoiceControlsProps) {
  const [isListening, setIsListening] = useState(false);
  const [languageId, setLanguageId] = useState<string>(VOICE_LANGUAGES[0].id);
  const [supported, setSupported] = useState(true);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  const isListeningRef = useRef(false);
  const baseTextRef = useRef("");
  const sessionFinalRef = useRef("");

  const selectedLanguage =
    VOICE_LANGUAGES.find((lang) => lang.id === languageId) || VOICE_LANGUAGES[0];

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;

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

    recognition.onerror = () => {
      isListeningRef.current = false;
      setIsListening(false);
    };

    recognition.onend = () => {
      if (!isListeningRef.current) {
        setIsListening(false);
        return;
      }

      try {
        recognition.start();
      } catch {
        isListeningRef.current = false;
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      isListeningRef.current = false;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.abort();
      recognitionRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = selectedLanguage.code;
    }
  }, [selectedLanguage.code]);

  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    setIsListening(false);
    recognitionRef.current?.stop();
  }, []);

  const startListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    baseTextRef.current = valueRef.current;
    sessionFinalRef.current = "";
    recognition.lang = selectedLanguage.code;
    isListeningRef.current = true;
    setIsListening(true);

    try {
      recognition.start();
    } catch {
      isListeningRef.current = false;
      setIsListening(false);
    }
  }, [selectedLanguage.code]);

  const toggleListening = useCallback(() => {
    if (isListeningRef.current) {
      stopListening();
    } else {
      startListening();
    }
  }, [startListening, stopListening]);

  if (!supported) {
    return (
      <p className="text-xs text-slate-500">
        Voice not supported — type remarks instead.
      </p>
    );
  }

  return (
    <div className={cn(compact ? "space-y-2" : "space-y-3", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          {VOICE_LANGUAGES.map((lang) => (
            <button
              key={lang.id}
              type="button"
              onClick={() => setLanguageId(lang.id)}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                languageId === lang.id
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {lang.label}
            </button>
          ))}
        </div>

        <Button
          type="button"
          variant={isListening ? "danger" : "outline"}
          size="sm"
          onClick={toggleListening}
          className="ml-auto"
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
      </div>

      {isListening && (
        <p className="flex items-center gap-2 text-xs font-medium text-orange-600">
          <span className="h-2 w-2 animate-pulse rounded-full bg-orange-500" />
          Listening ({selectedLanguage.label})… tap Stop when done
        </p>
      )}
    </div>
  );
}
