"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Camera, ImagePlus, Trash2, Upload } from "lucide-react";
import Image from "next/image";
import { useRef } from "react";

interface PhotoUploadProps {
  value?: string;
  fileName?: string;
  onChange: (data: string | undefined, fileName?: string) => void;
  className?: string;
}

export function PhotoUpload({ value, fileName, onChange, className }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | null) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      onChange(reader.result as string, file.name);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-4 w-4" />
          Upload Photo
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            if (inputRef.current) {
              inputRef.current.setAttribute("capture", "environment");
              inputRef.current.click();
            }
          }}
        >
          <Camera className="h-4 w-4" />
          Take Photo
        </Button>
        {value && (
          <Button
            type="button"
            variant="danger"
            size="sm"
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
          handleFile(e.target.files?.[0] || null);
          e.target.value = "";
          inputRef.current?.removeAttribute("capture");
        }}
      />

      {value ? (
        <div className="relative overflow-hidden rounded-xl border border-slate-200">
          <Image
            src={value}
            alt={fileName || "Uploaded photo"}
            width={400}
            height={300}
            className="h-48 w-full object-cover"
            unoptimized
          />
          {fileName && (
            <p className="truncate px-3 py-2 text-xs text-slate-500">{fileName}</p>
          )}
        </div>
      ) : (
        <div className="flex h-32 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50">
          <div className="text-center text-slate-400">
            <ImagePlus className="mx-auto h-8 w-8" />
            <p className="mt-2 text-sm">No photo added</p>
          </div>
        </div>
      )}
    </div>
  );
}
