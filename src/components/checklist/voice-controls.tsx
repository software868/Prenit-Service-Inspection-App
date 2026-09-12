"use client";

import { Button } from "@/components/ui/button";
import { VOICE_LANGUAGES } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Mic, MicOff, Volume2 } from "lucide-react";
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
}

function joinRemarks(base: string, spoken: string): string {
  const trimmedBase = base.trim();
  const trimmedSpoken = spoken.trim();
  if (!trimmedBase) return trimmedSpoken;
  if (!trimmedSpoken) return trimmedBase;
  return `${trimmedBase} ${trimmedSpoken}`;
}

export function VoiceControls({ value, onChange, className }: VoiceControlsProps) {
  const [isListening, setIsListening] = useState(false);
  const [language, setLanguage] = useState<string>(VOICE_LANGUAGES[0].code);
  const [supported, setSupported] = useState(true);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  const isListeningRef = useRef(false);
  const baseTextRef = useRef("");
  const sessionFinalRef = useRef("");

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

      // Browsers often stop after a short pause even with continuous=true.
      // Restart while the user has not tapped Stop.
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
      recognitionRef.current.lang = language;
    }
  }, [language]);

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
    recognition.lang = language;
    isListeningRef.current = true;
    setIsListening(true);

    try {
      recognition.start();
    } catch {
      isListeningRef.current = false;
      setIsListening(false);
    }
  }, [language]);

  const toggleListening = useCallback(() => {
    if (isListeningRef.current) {
      stopListening();
    } else {
      startListening();
    }
  }, [startListening, stopListening]);

  const speakText = useCallback(() => {
    if (!value.trim() || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(value);
    utterance.lang = language;
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  }, [value, language]);

  if (!supported) {
    return (
      <p className="text-sm text-slate-500">
        Voice features are not supported in this browser. Please type your remarks.
      </p>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap gap-2">
        {VOICE_LANGUAGES.map((lang) => (
          <button
            key={lang.label}
            type="button"
            onClick={() => setLanguage(lang.code)}
            className={cn(
              "min-h-10 rounded-full px-3 py-2 text-sm font-medium transition-colors",
              language === lang.code
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            {lang.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
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
              Voice to Text
            </>
          )}
        </Button>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={speakText}
          disabled={!value.trim()}
        >
          <Volume2 className="h-4 w-4" />
          Read Aloud
        </Button>
      </div>

      {isListening && (
        <p className="flex items-center gap-2 text-sm font-medium text-orange-600">
          <span className="h-2 w-2 animate-pulse rounded-full bg-orange-500" />
          Listening... speak your full sentence, then tap Stop when finished
        </p>
      )}
    </div>
  );
}
