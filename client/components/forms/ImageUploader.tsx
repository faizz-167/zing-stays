'use client';
import { useState, useRef } from 'react';
import Image from 'next/image';
import { api } from '@/lib/api';

async function uploadToImageKit(file: File, authParams: { signature: string; expire: string; token: string }): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('fileName', `listing-${Date.now()}-${file.name}`);
  formData.append('folder', '/listings');
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
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList) => {
    setUploading(true);
    try {
      const authParams = await api.get<{ signature: string; expire: string; token: string }>('/images/auth');
      const urls = await Promise.all(Array.from(files).map(f => uploadToImageKit(f, authParams)));
      onChange([...images, ...urls]);
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
      <p className="font-sans text-xs text-muted-foreground">Add at least 3 photos for higher ranking. Supported: JPG, PNG, WebP.</p>
    </div>
  );
}
