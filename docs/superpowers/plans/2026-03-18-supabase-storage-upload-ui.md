# Supabase Storage Upload UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reusable file upload components that upload to Supabase Storage public buckets, and replace all raw URL inputs with these components across the app.

**Architecture:** Frontend-only upload flow using the existing Supabase JS client. Files upload directly to public Supabase Storage buckets from the browser. Django stores only the resulting public URLs in existing model fields (no backend changes needed for SP1). A shared storage helper (`lib/storage.ts`) handles path generation, validation, and upload logic. Three wrapper components (`FileUpload`, `AvatarUpload`, `LogoUpload`) provide drag-and-drop UX with previews.

**Tech Stack:** React 18, TypeScript, Supabase JS Client (already in project), TailwindCSS

---

## File Structure

| File | Responsibility |
|------|---------------|
| `frontend/src/lib/storage.ts` | Storage helper: bucket configs, path generation, upload/delete functions |
| `frontend/src/components/upload/FileUpload.tsx` | Generic upload component: drag-and-drop, progress, preview, error states |
| `frontend/src/components/upload/AvatarUpload.tsx` | Circular avatar upload wrapping FileUpload |
| `frontend/src/components/upload/LogoUpload.tsx` | Square logo upload wrapping FileUpload |
| `frontend/src/pages/settings/SettingsPage.tsx` | Replace avatar URL text input with AvatarUpload |
| `frontend/src/pages/startups/StartupsPage.tsx` | Add LogoUpload to CreateStartupModal |
| `frontend/src/pages/startups/StartupDetailPage.tsx` | No changes in SP1 (edit forms come later) |

---

### Task 1: Create Supabase Storage Buckets

**Files:** None (Supabase SQL)

**Note:** Buckets must exist before any upload code can work, so this is the first task.

- [ ] **Step 1: Create the three storage buckets via Supabase SQL**

Run this via the Supabase MCP or dashboard. Creates public buckets with RLS policies:

```sql
-- Create buckets
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('avatars', 'avatars', true),
  ('logos', 'logos', true),
  ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to avatars
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- Allow public read for avatars
CREATE POLICY "Public read avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Allow users to delete their own avatars
CREATE POLICY "Users can delete own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to upload logos
CREATE POLICY "Authenticated users can upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'logos');

-- Allow public read for logos
CREATE POLICY "Public read logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'logos');

-- Allow users to delete their own logos
CREATE POLICY "Users can delete own logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'logos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to upload documents
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Allow public read for documents
CREATE POLICY "Public read documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'documents');

-- Allow users to delete their own documents
CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);
```

- [ ] **Step 2: Verify buckets exist**

Check via Supabase dashboard or MCP that `avatars`, `logos`, and `documents` buckets are listed and marked as public.

---

### Task 2: Storage Helper (`lib/storage.ts`)

**Files:**
- Create: `frontend/src/lib/storage.ts`

- [ ] **Step 1: Create the storage helper module**

This module defines bucket configurations, generates collision-safe paths, and wraps Supabase upload/delete calls.

```typescript
// frontend/src/lib/storage.ts
import { supabase } from "./supabase";
import { v4 as uuidv4 } from "uuid";

export interface BucketConfig {
  name: string;
  maxSize: number; // bytes
  acceptedTypes: string[];
}

export const BUCKETS: Record<string, BucketConfig> = {
  avatars: {
    name: "avatars",
    maxSize: 2 * 1024 * 1024, // 2MB
    acceptedTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  },
  logos: {
    name: "logos",
    maxSize: 2 * 1024 * 1024, // 2MB
    acceptedTypes: ["image/jpeg", "image/png", "image/webp", "image/svg+xml"],
  },
  documents: {
    name: "documents",
    maxSize: 10 * 1024 * 1024, // 10MB
    acceptedTypes: ["application/pdf"],
  },
};

export function validateFile(
  file: File,
  bucket: BucketConfig
): string | null {
  if (!bucket.acceptedTypes.includes(file.type)) {
    const allowed = bucket.acceptedTypes
      .map((t) => t.split("/")[1].toUpperCase())
      .join(", ");
    return `File type not allowed. Accepted: ${allowed}`;
  }
  if (file.size > bucket.maxSize) {
    const maxMB = bucket.maxSize / (1024 * 1024);
    return `File too large. Maximum size: ${maxMB}MB`;
  }
  return null;
}

function generatePath(userId: string, file: File): string {
  const ext = file.name.split(".").pop() || "";
  return `${userId}/${uuidv4()}.${ext}`;
}

export async function uploadFile(
  file: File,
  bucketName: string,
  userId: string
): Promise<{ url: string; path: string }> {
  const bucket = BUCKETS[bucketName];
  if (!bucket) throw new Error(`Unknown bucket: ${bucketName}`);

  const error = validateFile(file, bucket);
  if (error) throw new Error(error);

  const path = generatePath(userId, file);

  const { error: uploadError } = await supabase.storage
    .from(bucket.name)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) throw new Error(uploadError.message);

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket.name).getPublicUrl(path);

  return { url: publicUrl, path };
}

export async function deleteFile(
  bucketName: string,
  path: string
): Promise<void> {
  const { error } = await supabase.storage.from(bucketName).remove([path]);
  if (error) throw new Error(error.message);
}

export function getPathFromUrl(url: string, bucketName: string): string | null {
  // Extract the storage path from a full public URL
  // URL format: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
  const marker = `/storage/v1/object/public/${bucketName}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.substring(idx + marker.length);
}
```

- [ ] **Step 2: Install uuid dependency**

Run: `docker compose exec react-frontend npm install uuid && docker compose exec react-frontend npm install -D @types/uuid`

Expected: Package added to package.json

- [ ] **Step 3: Verify the module compiles**

Run: `docker compose exec react-frontend npx tsc --noEmit --pretty 2>&1 | head -20`

Expected: No errors related to `storage.ts`

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/storage.ts frontend/package.json frontend/package-lock.json
git commit -m "Add Supabase Storage helper with bucket configs and upload/delete functions"
```

---

### Task 3: FileUpload Component

**Files:**
- Create: `frontend/src/components/upload/FileUpload.tsx`

- [ ] **Step 1: Create the generic FileUpload component**

This is the core upload UI — drag-and-drop zone, file preview, progress indication, error display, and delete/replace.

```tsx
// frontend/src/components/upload/FileUpload.tsx
import { useState, useRef, useCallback, type DragEvent, type ChangeEvent } from "react";
import { Upload, X, FileText, AlertCircle, Loader2 } from "lucide-react";
import { uploadFile, deleteFile, getPathFromUrl, BUCKETS, validateFile } from "@/lib/storage";
import { useAuth } from "@/contexts/AuthContext";

interface FileUploadProps {
  bucket: string;
  onUpload: (url: string) => void;
  existingUrl?: string;
  label?: string;
  hint?: string;
  className?: string;
}

export function FileUpload({
  bucket,
  onUpload,
  existingUrl,
  label,
  hint,
  className = "",
}: FileUploadProps) {
  const { profile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(existingUrl || null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const bucketConfig = BUCKETS[bucket];
  const isImage = bucketConfig?.acceptedTypes.every((t) => t.startsWith("image/"));

  const handleFile = useCallback(
    async (file: File) => {
      if (!profile?.id || !bucketConfig) return;

      setError(null);

      // Client-side validation
      const validationError = validateFile(file, bucketConfig);
      if (validationError) {
        setError(validationError);
        return;
      }

      // Show preview for images
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        setPreview(file.name);
      }

      setUploading(true);
      try {
        // Delete old file if replacing
        if (existingUrl) {
          const oldPath = getPathFromUrl(existingUrl, bucket);
          if (oldPath) {
            await deleteFile(bucket, oldPath).catch(() => {});
          }
        }

        const { url } = await uploadFile(file, bucket, profile.id);
        onUpload(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
        setPreview(existingUrl || null);
      } finally {
        setUploading(false);
      }
    },
    [profile?.id, bucket, bucketConfig, existingUrl, onUpload]
  );

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset input so same file can be re-selected
      e.target.value = "";
    },
    [handleFile]
  );

  const handleRemove = useCallback(async () => {
    if (existingUrl) {
      const path = getPathFromUrl(existingUrl, bucket);
      if (path) {
        await deleteFile(bucket, path).catch(() => {});
      }
    }
    setPreview(null);
    setError(null);
    onUpload("");
  }, [existingUrl, bucket, onUpload]);

  const maxMB = bucketConfig ? bucketConfig.maxSize / (1024 * 1024) : 0;
  const acceptStr = bucketConfig?.acceptedTypes.join(",") || "";

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-brand-text mb-1.5">
          {label}
        </label>
      )}

      {/* Preview state */}
      {preview && !uploading ? (
        <div className="relative group">
          {isImage && typeof preview === "string" && (preview.startsWith("http") || preview.startsWith("data:")) ? (
            <div className="relative w-full h-40 rounded-xl border border-brand-border/40 overflow-hidden bg-brand-bg">
              <img
                src={preview}
                alt="Preview"
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-brand-border/40 bg-brand-bg">
              <FileText className="w-5 h-5 text-brand-accent flex-shrink-0" />
              <span className="text-sm text-brand-text truncate flex-1">
                {typeof preview === "string" && preview.startsWith("http")
                  ? preview.split("/").pop()
                  : preview}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/90 border border-brand-border/40 text-brand-muted hover:text-red-500 hover:border-red-200 transition-all opacity-0 group-hover:opacity-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        /* Drop zone */
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`
            flex flex-col items-center justify-center gap-2 px-6 py-8 rounded-xl border-2 border-dashed cursor-pointer transition-all
            ${dragOver
              ? "border-brand-blue bg-brand-blue/5"
              : "border-brand-border/60 hover:border-brand-blue/40 hover:bg-brand-bg/50"
            }
            ${uploading ? "pointer-events-none opacity-60" : ""}
          `}
        >
          {uploading ? (
            <Loader2 className="w-8 h-8 text-brand-blue animate-spin" />
          ) : (
            <Upload className="w-8 h-8 text-brand-muted" />
          )}
          <div className="text-center">
            <p className="text-sm font-medium text-brand-text">
              {uploading ? "Uploading..." : "Drop file here or click to browse"}
            </p>
            <p className="text-xs text-brand-muted mt-1">
              {hint || `Max ${maxMB}MB · ${bucketConfig?.acceptedTypes.map((t) => t.split("/")[1].toUpperCase()).join(", ")}`}
            </p>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={acceptStr}
        onChange={handleChange}
        className="hidden"
      />

      {error && (
        <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg bg-red-50 text-red-700 text-xs">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `docker compose exec react-frontend npx tsc --noEmit --pretty 2>&1 | head -20`

Expected: No errors related to `FileUpload.tsx`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/upload/FileUpload.tsx
git commit -m "Add generic FileUpload component with drag-and-drop, preview, and error handling"
```

---

### Task 4: AvatarUpload Component

**Files:**
- Create: `frontend/src/components/upload/AvatarUpload.tsx`

- [ ] **Step 1: Create the AvatarUpload wrapper**

Circular avatar-specific UI that wraps FileUpload logic. Shows current avatar or initials fallback with a hover overlay to change.

```tsx
// frontend/src/components/upload/AvatarUpload.tsx
import { useState, useEffect, useRef, useCallback, type ChangeEvent } from "react";
import { Camera, Loader2 } from "lucide-react";
import { uploadFile, deleteFile, getPathFromUrl, BUCKETS, validateFile } from "@/lib/storage";
import { useAuth } from "@/contexts/AuthContext";

interface AvatarUploadProps {
  currentUrl?: string;
  name: string;
  onUpload: (url: string) => void;
  size?: "md" | "lg" | "xl";
}

const sizeStyles = {
  md: "w-16 h-16",
  lg: "w-20 h-20",
  xl: "w-24 h-24",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function AvatarUpload({
  currentUrl,
  name,
  onUpload,
  size = "lg",
}: AvatarUploadProps) {
  const { profile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl || null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync preview when parent prop changes (e.g. after refreshProfile)
  useEffect(() => {
    setPreviewUrl(currentUrl || null);
  }, [currentUrl]);

  const bucket = BUCKETS.avatars;

  const handleChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !profile?.id) return;
      e.target.value = "";

      setError(null);

      const validationError = validateFile(file, bucket);
      if (validationError) {
        setError(validationError);
        return;
      }

      // Show local preview immediately
      const reader = new FileReader();
      reader.onload = (ev) => setPreviewUrl(ev.target?.result as string);
      reader.readAsDataURL(file);

      setUploading(true);
      try {
        // Delete old avatar if exists
        if (currentUrl) {
          const oldPath = getPathFromUrl(currentUrl, "avatars");
          if (oldPath) await deleteFile("avatars", oldPath).catch(() => {});
        }

        const { url } = await uploadFile(file, "avatars", profile.id);
        setPreviewUrl(url);
        onUpload(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
        setPreviewUrl(currentUrl || null);
      } finally {
        setUploading(false);
      }
    },
    [profile?.id, currentUrl, bucket, onUpload]
  );

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`relative rounded-full overflow-hidden group ${sizeStyles[size]}`}
        disabled={uploading}
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-brand-dark text-white flex items-center justify-center font-semibold text-lg">
            {getInitials(name || "?")}
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          {uploading ? (
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          ) : (
            <Camera className="w-5 h-5 text-white" />
          )}
        </div>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={bucket.acceptedTypes.join(",")}
        onChange={handleChange}
        className="hidden"
      />

      <p className="text-xs text-brand-muted">
        {uploading ? "Uploading..." : "Click to change"}
      </p>

      {error && (
        <p className="text-xs text-red-600 text-center max-w-48">{error}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `docker compose exec react-frontend npx tsc --noEmit --pretty 2>&1 | head -20`

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/upload/AvatarUpload.tsx
git commit -m "Add AvatarUpload component with circular preview and camera overlay"
```

---

### Task 5: LogoUpload Component

**Files:**
- Create: `frontend/src/components/upload/LogoUpload.tsx`

- [ ] **Step 1: Create the LogoUpload wrapper**

Square/rounded logo-specific upload that wraps FileUpload logic. Shows current logo or a building icon fallback.

```tsx
// frontend/src/components/upload/LogoUpload.tsx
import { useState, useEffect, useRef, useCallback, type ChangeEvent } from "react";
import { Building2, Camera, Loader2 } from "lucide-react";
import { uploadFile, deleteFile, getPathFromUrl, BUCKETS, validateFile } from "@/lib/storage";
import { useAuth } from "@/contexts/AuthContext";

interface LogoUploadProps {
  currentUrl?: string;
  startupName?: string;
  onUpload: (url: string) => void;
}

export function LogoUpload({
  currentUrl,
  startupName,
  onUpload,
}: LogoUploadProps) {
  const { profile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl || null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync preview when parent prop changes
  useEffect(() => {
    setPreviewUrl(currentUrl || null);
  }, [currentUrl]);

  const bucket = BUCKETS.logos;

  const handleChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !profile?.id) return;
      e.target.value = "";

      setError(null);

      const validationError = validateFile(file, bucket);
      if (validationError) {
        setError(validationError);
        return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => setPreviewUrl(ev.target?.result as string);
      reader.readAsDataURL(file);

      setUploading(true);
      try {
        if (currentUrl) {
          const oldPath = getPathFromUrl(currentUrl, "logos");
          if (oldPath) await deleteFile("logos", oldPath).catch(() => {});
        }

        const { url } = await uploadFile(file, "logos", profile.id);
        setPreviewUrl(url);
        onUpload(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
        setPreviewUrl(currentUrl || null);
      } finally {
        setUploading(false);
      }
    },
    [profile?.id, currentUrl, bucket, onUpload]
  );

  return (
    <div>
      <label className="block text-sm font-medium text-brand-text mb-1.5">
        Logo
      </label>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative w-20 h-20 rounded-xl overflow-hidden group border border-brand-border/40 bg-brand-bg"
        disabled={uploading}
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={startupName || "Logo"}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Building2 className="w-8 h-8 text-brand-muted" />
          </div>
        )}

        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          {uploading ? (
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          ) : (
            <Camera className="w-5 h-5 text-white" />
          )}
        </div>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={bucket.acceptedTypes.join(",")}
        onChange={handleChange}
        className="hidden"
      />

      <p className="text-xs text-brand-muted mt-1.5">
        {uploading ? "Uploading..." : "Click to upload logo"}
      </p>

      {error && (
        <p className="text-xs text-red-600 mt-1">{error}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `docker compose exec react-frontend npx tsc --noEmit --pretty 2>&1 | head -20`

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/upload/LogoUpload.tsx
git commit -m "Add LogoUpload component with square preview and building icon fallback"
```

---

### Task 6: Integrate AvatarUpload into SettingsPage

**Files:**
- Modify: `frontend/src/pages/settings/SettingsPage.tsx:1-152`

- [ ] **Step 1: Replace the avatar URL text input with AvatarUpload**

In `SettingsPage.tsx`, make these changes:

1. Add import at top:
```tsx
import { AvatarUpload } from "@/components/upload/AvatarUpload";
```

2. Replace the existing Avatar display + URL input. The current profile card header (lines 46-62) shows a read-only Avatar. Replace it with the AvatarUpload component, and remove the "Avatar URL" text input (lines 101-114).

Replace the profile card header section (lines 47-62):
```tsx
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-brand-border/20">
          <AvatarUpload
            currentUrl={form.avatar_url || undefined}
            name={form.full_name || "User"}
            onUpload={(url) => setForm((f) => ({ ...f, avatar_url: url }))}
            size="lg"
          />
          <div>
            <h2 className="text-lg font-semibold text-brand-text">
              {profile?.full_name}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <Mail className="w-3.5 h-3.5 text-brand-muted" />
              <span className="text-sm text-brand-muted">{profile?.email}</span>
            </div>
          </div>
        </div>
```

Delete the "Avatar URL" input block entirely (lines 101-114).

Also remove the unused `Avatar` import from the imports since we no longer use it.

- [ ] **Step 2: Verify it compiles and renders**

Run: `docker compose exec react-frontend npx tsc --noEmit --pretty 2>&1 | head -20`

Expected: No errors. Visit http://localhost:5173/settings — avatar should show with camera overlay on hover instead of a URL input.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/settings/SettingsPage.tsx
git commit -m "Replace avatar URL input with AvatarUpload component in settings"
```

---

### Task 7: Integrate LogoUpload into CreateStartupModal

**Files:**
- Modify: `frontend/src/pages/startups/StartupsPage.tsx:285-440` (CreateStartupModal)

- [ ] **Step 1: Add logo upload to the create startup form**

1. Add import at top of file:
```tsx
import { LogoUpload } from "@/components/upload/LogoUpload";
```

2. Add `logo_url` to the form state (line 294-301). Change:
```tsx
  const [form, setForm] = useState({
    name: "",
    description: "",
    industry: "",
    location: "",
    founding_date: "",
    website: "",
  });
```
to:
```tsx
  const [form, setForm] = useState({
    name: "",
    description: "",
    industry: "",
    location: "",
    founding_date: "",
    website: "",
    logo_url: "",
  });
```

3. Add the LogoUpload component inside the form, after the error message div and before the "Startup Name" input (after line 342):
```tsx
          <LogoUpload
            startupName={form.name}
            onUpload={(url) => updateField("logo_url", url)}
          />
```

4. Update `handleSubmit` to omit empty URL fields before sending (Django's URLField may reject empty strings). Change the `api.post` call to filter out empty optional URL fields:
```tsx
    try {
      const payload: Record<string, unknown> = { ...form };
      if (!payload.logo_url) delete payload.logo_url;
      if (!payload.pitch_deck_url) delete payload.pitch_deck_url;
      await api.post("/startups/", payload);
      onCreated();
    }
```

- [ ] **Step 2: Verify it compiles**

Run: `docker compose exec react-frontend npx tsc --noEmit --pretty 2>&1 | head -20`

Expected: No errors. Visit http://localhost:5173/startups and click "New Startup" — logo upload should appear in the form.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/startups/StartupsPage.tsx
git commit -m "Add LogoUpload to create startup modal"
```

---

### Task 8: Add PitchDeck FileUpload to CreateStartupModal

**Files:**
- Modify: `frontend/src/pages/startups/StartupsPage.tsx:285-440` (CreateStartupModal)

- [ ] **Step 1: Add pitch deck upload to the create startup form**

1. Add FileUpload import (alongside the existing LogoUpload import):
```tsx
import { FileUpload } from "@/components/upload/FileUpload";
```

2. Add `pitch_deck_url` to the form state:
```tsx
  const [form, setForm] = useState({
    name: "",
    description: "",
    industry: "",
    location: "",
    founding_date: "",
    website: "",
    logo_url: "",
    pitch_deck_url: "",
  });
```

3. Add the FileUpload component after the Website grid row and before the action buttons:
```tsx
          <FileUpload
            bucket="documents"
            label="Pitch Deck (PDF)"
            onUpload={(url) => updateField("pitch_deck_url", url)}
            hint="Upload your pitch deck as PDF, max 10MB"
          />
```

4. The `handleSubmit` payload filter from Task 7 already handles `pitch_deck_url` — no additional change needed.

- [ ] **Step 2: Verify it compiles**

Run: `docker compose exec react-frontend npx tsc --noEmit --pretty 2>&1 | head -20`

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/startups/StartupsPage.tsx
git commit -m "Add pitch deck PDF upload to create startup modal"
```

---

### Task 9: End-to-End Smoke Test

- [ ] **Step 1: Test avatar upload in Settings**

1. Go to http://localhost:5173/settings
2. Hover over the avatar — camera icon should appear
3. Click and select a JPG/PNG under 2MB
4. Avatar should update with the uploaded image
5. Click "Save Changes" — page should show success, avatar persists after reload

- [ ] **Step 2: Test logo + pitch deck upload in Create Startup**

1. Go to http://localhost:5173/startups and click "New Startup"
2. Upload a logo image — should show in the square preview
3. Upload a PDF for pitch deck — should show file icon with filename
4. Fill in required fields and submit
5. New startup should appear in the list with the uploaded logo

- [ ] **Step 3: Test error handling**

1. Try uploading a file > 2MB for avatar — should show error message
2. Try uploading a .txt file for pitch deck — should show "File type not allowed"
3. Try drag-and-drop for the pitch deck upload zone

- [ ] **Step 4: Commit any fixes found during testing**

```bash
git add -u
git commit -m "Fix issues found during upload smoke testing"
```
