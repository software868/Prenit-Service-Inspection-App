"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Mic, Square, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface AudioNoteProps {
  value?: string;
  fileName?: string;
  onChange: (data: string | undefined, fileName?: string) => void;
  className?: string;
}

export function AudioNote({ value, fileName, onChange, className }: AudioNoteProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      mediaRecorderRef.current?.stop();
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onload = () => {
          onChange(reader.result as string, `audio-note-${Date.now()}.webm`);
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch {
      alert("Microphone access denied. Please allow microphone permission.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleFileUpload = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string, file.name);
    reader.readAsDataURL(file);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap gap-2">
        {!isRecording ? (
          <Button type="button" variant="outline" size="sm" onClick={startRecording}>
            <Mic className="h-4 w-4" />
            Record
          </Button>
        ) : (
          <Button type="button" variant="danger" size="sm" onClick={stopRecording}>
            <Square className="h-4 w-4" />
            Stop ({formatTime(recordingTime)})
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-4 w-4" />
          Upload Audio
        </Button>
        {value && (
          <Button type="button" variant="danger" size="sm" onClick={() => onChange(undefined)}>
            <Trash2 className="h-4 w-4" />
            Remove
          </Button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          handleFileUpload(e.target.files?.[0] || null);
          e.target.value = "";
        }}
      />

      {value ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <audio controls src={value} className="w-full" />
          {fileName && <p className="mt-1 truncate text-xs text-slate-500">{fileName}</p>}
        </div>
      ) : (
        <p className="text-sm text-slate-500">No audio note added</p>
      )}
    </div>
  );
}
