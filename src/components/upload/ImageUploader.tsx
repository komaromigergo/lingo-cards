"use client";

import { useCallback, useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface UploadedImage {
  id: string;
  file: File;
  previewUrl: string;
  base64: string;
  mimeType: string;
}

export interface ImageUploaderProps {
  images: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  maxImages?: number;
  disabled?: boolean;
  label?: string;
  helperText?: string;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // strip the "data:image/png;base64," prefix — Gemini wants raw base64
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Multi-photo uploader used for both Gemini import modes (notebook / textbook).
 * Supports drag-and-drop, file picker, and direct camera capture on mobile.
 */
export function ImageUploader({
  images,
  onChange,
  maxImages = 15,
  disabled = false,
  label = "Upload photos",
  helperText,
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (!fileArray.length) return;

      const room = maxImages - images.length;
      const toAdd = fileArray.slice(0, Math.max(0, room));
      if (!toAdd.length) return;

      setIsProcessing(true);
      try {
        const processed: UploadedImage[] = await Promise.all(
          toAdd.map(async (file) => ({
            id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
            file,
            previewUrl: URL.createObjectURL(file),
            base64: await fileToBase64(file),
            mimeType: file.type,
          }))
        );
        onChange([...images, ...processed]);
      } finally {
        setIsProcessing(false);
      }
    },
    [images, maxImages, onChange]
  );

  const removeImage = (id: string) => {
    const target = images.find((img) => img.id === id);
    if (target) URL.revokeObjectURL(target.previewUrl);
    onChange(images.filter((img) => img.id !== id));
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-secondary/40 p-8 text-center transition-colors",
          isDragging && "border-primary bg-primary/5",
          disabled && "pointer-events-none opacity-50"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          void addFiles(e.dataTransfer.files);
        }}
      >
        {isProcessing ? (
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        ) : (
          <ImagePlus className="h-8 w-8 text-muted-foreground" />
        )}
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">
          {helperText ?? `Drag & drop, or choose photos (up to ${maxImages})`}
        </p>
        <div className="mt-2 flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <ImagePlus className="mr-1.5 h-4 w-4" />
            Choose photos
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => cameraInputRef.current?.click()}>
            <Camera className="mr-1.5 h-4 w-4" />
            Camera
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && void addFiles(e.target.files)}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => e.target.files && void addFiles(e.target.files)}
        />
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((img) => (
            /* eslint-disable-next-line @next/next/no-img-element */
            <div key={img.id} className="group relative aspect-square overflow-hidden rounded-xl border border-border">
              <img src={img.previewUrl} alt="Uploaded page" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(img.id)}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Remove image"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      {images.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {images.length} / {maxImages} photos selected
        </p>
      )}
    </div>
  );
}
