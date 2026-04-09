'use client';
import { useState, useRef } from 'react';
import Image from 'next/image';
import { api } from '@/lib/api';

const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

interface ImageUploadAuth {
  signature: string;
  expire: string;
  token: string;
  folder: string;
  fileName: string;
}

async function uploadToImageKit(file: File, authParams: ImageUploadAuth): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('fileName', authParams.fileName);
  formData.append('folder', authParams.folder);
  formData.append('publicKey', process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY!);
  formData.append('signature', authParams.signature);
  formData.append('expire', authParams.expire);
  formData.append('token', authParams.token);

  const res = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
    method: 'POST',
    body: formData,
  });
  const data = await res.json() as { url: string };
  return data.url;
}

interface ImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
}

export default function ImageUploader({ images, onChange }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList) => {
    const selectedFiles = Array.from(files);
    const nextCount = images.length + selectedFiles.length;

    if (nextCount > 12) {
      setError('A listing can include up to 12 images.');
      return;
    }

    const invalidFile = selectedFiles.find(
      (file) => !ALLOWED_CONTENT_TYPES.has(file.type) || file.size > MAX_IMAGE_SIZE_BYTES,
    );
    if (invalidFile) {
      setError('Only JPG, PNG, and WebP images up to 8 MB are allowed.');
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const urls = await Promise.all(selectedFiles.map(async (file, index) => {
        const authParams = await api.post<ImageUploadAuth>('/images/auth', {
          originalFileName: file.name,
          contentType: file.type,
          size: file.size,
          existingImageCount: images.length + index,
        });

        return uploadToImageKit(file, authParams);
      }));
      onChange([...images, ...urls]);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (url: string) => onChange(images.filter(i => i !== url));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {images.map(url => (
          <div key={url} className="relative aspect-square rounded-lg overflow-hidden bg-muted group">
            <Image
              src={url}
              alt="Listing"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 33vw, 160px"
            />
            <button
              type="button"
              onClick={() => removeImage(url)}
              className="absolute inset-0 bg-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-mono text-xs uppercase tracking-wider"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-accent transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-accent disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="text-2xl">{uploading ? '...' : '+'}</span>
          <span className="font-mono text-xs uppercase tracking-wider">{uploading ? 'Uploading' : 'Add Photo'}</span>
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => e.target.files && handleFiles(e.target.files)}
      />
      {error && <p className="font-sans text-xs text-red-600">{error}</p>}
      <p className="font-sans text-xs text-muted-foreground">Add at least 3 photos for higher ranking. Supported: JPG, PNG, WebP.</p>
    </div>
  );
}
