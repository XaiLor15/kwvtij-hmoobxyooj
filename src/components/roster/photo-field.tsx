import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PersonAvatar } from "@/components/enterprise";
import { compressImage } from "@/lib/image";

/** Portrait photo picker: validates, resizes to 512px and previews. */
export function PhotoField({
  name,
  value,
  onChange,
}: {
  name: string;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex items-center gap-3">
      <PersonAvatar name={name || "?"} photo={value} size="xl" />
      <div className="flex flex-wrap gap-2">
        <input
          ref={ref}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            setBusy(true);
            const res = await compressImage(f, 512, 0.85);
            setBusy(false);
            if (res.ok) onChange(res.data);
            else toast.error(res.error);
          }}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => ref.current?.click()}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          {value ? "ປ່ຽນຮູບ" : "ເລືອກຮູບ"}
        </Button>
        {value && (
          <Button type="button" size="sm" variant="ghost" onClick={() => onChange(null)}>
            <X className="h-4 w-4" /> ລຶບຮູບ
          </Button>
        )}
      </div>
    </div>
  );
}
