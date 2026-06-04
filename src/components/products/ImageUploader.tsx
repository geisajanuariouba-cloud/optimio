import { useRef, useState } from "react";
import { friendlyError } from "@/lib/errors";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, X, ImagePlus, Loader2 } from "lucide-react";
import { LazyImage } from "@/components/ui/lazy-image";

type Props = {
  value?: string | null;
  onChange: (url: string | null) => void;
  folder?: string; // ex: "products" ou "variations"
  label?: string;
  className?: string;
};

const BUCKET = "product-images";
const MAX_MB = 5;

export function ImageUploader({ value, onChange, folder = "products", label = "Imagem", className }: Props) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [drag, setDrag] = useState(false);

  const upload = async (file: File) => {
    if (!user) return toast.error("Faça login para enviar imagens");
    if (!file.type.startsWith("image/")) return toast.error("Selecione uma imagem");
    if (file.size > MAX_MB * 1024 * 1024) return toast.error(`Imagem deve ter no máximo ${MAX_MB}MB`);

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });
      if (error) throw error;
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success("Imagem enviada");
    } catch (e: any) {
      toast.error(friendlyError(e, "Falha ao enviar imagem"));
    } finally {
      setUploading(false);
    }
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) upload(f);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) upload(f);
  };

  const remove = () => onChange(null);

  return (
    <div className={className}>
      {label && <div className="text-sm font-medium mb-1.5">{label}</div>}
      <input ref={inputRef} type="file" accept="image/*" onChange={onPick} className="hidden" />
      {value ? (
        <div className="relative w-full rounded-2xl overflow-hidden border bg-muted/30 group">
          <img src={value} alt="" className="w-full h-44 object-cover" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            <Button size="sm" variant="secondary" onClick={() => inputRef.current?.click()} className="rounded-xl gap-1" disabled={uploading}>
              <Upload className="h-3.5 w-3.5" /> Trocar
            </Button>
            <Button size="sm" variant="destructive" onClick={remove} className="rounded-xl gap-1" disabled={uploading}>
              <X className="h-3.5 w-3.5" /> Remover
            </Button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`w-full h-36 rounded-2xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center gap-2 transition
            ${drag ? "border-primary bg-primary/10" : "border-border bg-muted/30 hover:bg-muted/50"}`}
        >
          {uploading ? (
            <><Loader2 className="h-5 w-5 animate-spin text-primary" /><span className="text-xs text-muted-foreground">Enviando…</span></>
          ) : (
            <>
              <ImagePlus className="h-6 w-6 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Arraste uma imagem ou clique para enviar</span>
              <span className="text-[10px] text-muted-foreground">PNG, JPG, WEBP — até {MAX_MB}MB</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
