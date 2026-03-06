import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ImageUploadProps {
  bucket: string;
  path: string;
  currentImageUrl?: string;
  onUploadComplete: (url: string) => void;
  accept?: string;
  maxSizeMB?: number;
}

export const ImageUpload = ({
  bucket,
  path,
  currentImageUrl,
  onUploadComplete,
  accept = "image/jpeg,image/png,image/webp,image/jpg",
  maxSizeMB = 5,
}: ImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string>(currentImageUrl || "");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update preview when currentImageUrl changes
  useEffect(() => {
    setPreview(currentImageUrl || "");
  }, [currentImageUrl]);

  const uploadImage = async (file: File) => {
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`A imagem deve ter no máximo ${maxSizeMB}MB`);
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${path}-${Math.random()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      setPreview(publicUrl);
      onUploadComplete(publicUrl);
      toast.success("Imagem enviada com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao enviar imagem: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadImage(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadImage(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const removeImage = async () => {
    setPreview("");
    onUploadComplete("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        id={`file-upload-${path}`}
      />

      {preview ? (
        <div className="relative">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-48 object-cover rounded-lg border"
          />
          <Button
            onClick={removeImage}
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2"
            disabled={uploading}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <label
          htmlFor={`file-upload-${path}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
            isDragging
              ? "border-primary bg-primary/10"
              : "border-muted-foreground/25 hover:border-primary"
          }`}
        >
          {uploading ? (
            <Loader2 className="w-12 h-12 animate-spin text-muted-foreground" />
          ) : (
            <>
              <Upload className="w-12 h-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground text-center px-4">
                Clique para selecionar ou arraste uma imagem
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Máximo {maxSizeMB}MB
              </p>
            </>
          )}
        </label>
      )}
    </div>
  );
};
