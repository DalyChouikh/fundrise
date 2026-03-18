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
