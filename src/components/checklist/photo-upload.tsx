"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Camera, ImagePlus, Trash2, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface PhotoUploadProps {
  value?: string;
  fileName?: string;
  onChange: (data: string | undefined, fileName?: string) => void;
  className?: string;
}

export function PhotoUpload({ value, fileName, onChange, className }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [error, setError] = useState("");

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOpen(false);
  };

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!cameraOpen || !video || !stream) return;
    video.srcObject = stream;
    void video.play().catch(() => {
      setError("Could not start the camera preview.");
    });
  }, [cameraOpen]);

  const handleFile = async (file: File | null) => {
    if (!file) return;

    if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
      setError("Please choose a photo");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setError("Photo must be under 8 MB");
      return;
    }

    setUploading(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Upload failed");
      onChange(data.url, file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const openCamera = async () => {
    setError("");
    if (!window.isSecureContext) {
      setError("Camera needs HTTPS. Open the site with a secure link.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This browser cannot open the camera.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" } },
      });
      streamRef.current = stream;
      setCameraOpen(true);
    } catch {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: true,
        });
        streamRef.current = stream;
        setCameraOpen(true);
      } catch {
        setError("Allow camera access, then tap Take Photo again.");
      }
    }
  };

  const capturePhoto = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      setError("Camera is not ready yet.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.9);
    });
    stopCamera();
    if (!blob) {
      setError("Could not capture the photo.");
      return;
    }

    const file = new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" });
    await handleFile(file);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          loading={uploading}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-4 w-4" />
          Upload Photo
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => void openCamera()}
        >
          <Camera className="h-4 w-4" />
          Take Photo
        </Button>
        {value && (
          <Button
            type="button"
            variant="danger"
            size="sm"
            disabled={uploading}
            onClick={() => onChange(undefined)}
          >
            <Trash2 className="h-4 w-4" />
            Remove
          </Button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void handleFile(e.target.files?.[0] || null);
          e.target.value = "";
        }}
      />

      {error ? <p className="text-xs text-orange-600">{error}</p> : null}

      {cameraOpen ? (
        <div className="fixed inset-0 z-[80] flex flex-col bg-black">
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <p className="text-sm font-semibold">Take Photo</p>
            <button
              type="button"
              onClick={stopCamera}
              className="rounded-lg p-2 hover:bg-white/10"
              aria-label="Close camera"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="min-h-0 flex-1 w-full bg-black object-contain"
          />
          <div className="flex gap-3 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button type="button" variant="outline" className="flex-1" onClick={stopCamera}>
              Cancel
            </Button>
            <Button type="button" variant="secondary" className="flex-1" onClick={() => void capturePhoto()}>
              <Camera className="h-4 w-4" />
              Capture
            </Button>
          </div>
        </div>
      ) : null}

      {value ? (
        <div className="relative overflow-hidden rounded-xl border border-slate-200">
          <img
            src={value}
            alt={fileName || "Uploaded photo"}
            className="h-48 w-full object-cover"
          />
          {fileName && (
            <p className="truncate px-3 py-2 text-xs text-slate-500">{fileName}</p>
          )}
        </div>
      ) : (
        <div className="flex h-32 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50">
          <div className="text-center text-slate-400">
            <ImagePlus className="mx-auto h-8 w-8" />
            <p className="mt-2 text-sm">
              {uploading ? "Uploading photo..." : "Optional — add a photo only if needed"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
