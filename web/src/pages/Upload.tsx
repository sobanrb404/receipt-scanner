import { useCallback, useRef, useState, type DragEvent, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../api/client";
import type { Receipt } from "../api/types";

export function Upload() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const uploadFile = useCallback(
    async (file: File) => {
      setError(null);
      setUploading(true);
      try {
        const receipt = await api.upload<Receipt>("/receipts", file);
        navigate(`/receipts/${receipt.id}`);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Upload failed. Try again.");
      } finally {
        setUploading(false);
      }
    },
    [navigate],
  );

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }

  function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-extrabold tracking-tight mb-1">Upload a receipt</h1>
      <p className="text-[var(--color-ink-soft)] mb-6">
        Drop an image, or pick one from your computer. It'll be read and categorized automatically.
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg py-16 px-6 text-center cursor-pointer transition-colors ${
          isDragging
            ? "border-[var(--color-accent)] bg-orange-50"
            : "border-[var(--color-line)] bg-[var(--color-paper-raised)] hover:border-[var(--color-teal)]"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileSelect}
        />
        {uploading ? (
          <p className="text-[var(--color-ink-soft)]">Uploading…</p>
        ) : (
          <>
            <p className="font-medium mb-1">Drag a receipt image here, or click to browse</p>
            <p className="text-sm text-[var(--color-ink-soft)]">JPEG, PNG or WEBP, up to 10MB</p>
          </>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 mt-4">
          {error}
        </p>
      )}
    </div>
  );
}
