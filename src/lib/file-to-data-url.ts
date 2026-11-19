// Convert a File to a permanent (persistable) base64 data URL.
// Blob URLs (URL.createObjectURL) live only for the session and are stripped
// by our stores before persisting — data URLs survive refresh and sync.
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(file);
  });
}
