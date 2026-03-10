import { useCallback, useState, useRef } from "react";
import { Upload, File, X, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/pdf-utils";

interface FileUploadProps {
  accept?: string;
  multiple?: boolean;
  maxSizeMb?: number;
  onFiles: (files: File[]) => void;
  files?: File[];
  onRemoveFile?: (index: number) => void;
  label?: string;
  description?: string;
}

export function FileUpload({
  accept = ".pdf",
  multiple = false,
  maxSizeMb = 25,
  onFiles,
  files = [],
  onRemoveFile,
  label = "Drop your PDF here",
  description,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else {
      setIsDragging(false);
    }
  }, []);

  const processFiles = useCallback(
    (newFiles: FileList | null) => {
      if (!newFiles) return;
      const arr = Array.from(newFiles).filter((f) => {
        const acceptTypes = accept.split(",").map((a) => a.trim());
        const matches = acceptTypes.some((a) => {
          if (a.startsWith(".")) return f.name.toLowerCase().endsWith(a);
          return f.type.startsWith(a.replace("*", ""));
        });
        return matches && f.size <= maxSizeMb * 1024 * 1024;
      });
      onFiles(arr);
    },
    [accept, maxSizeMb, onFiles]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      processFiles(e.dataTransfer.files);
    },
    [processFiles]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      processFiles(e.target.files);
      e.target.value = "";
    },
    [processFiles]
  );

  const hasFiles = files.length > 0;

  return (
    <div className="flex flex-col gap-3">
      <div
        onClick={() => inputRef.current?.click()}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={cn(
          "relative flex flex-col items-center justify-center gap-3 p-8 rounded-md border-2 border-dashed cursor-pointer transition-all duration-200",
          isDragging
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-border hover:border-primary/50 hover:bg-accent/40",
          hasFiles && "border-primary/30 bg-primary/3"
        )}
        data-testid="dropzone-file-upload"
        role="button"
        tabIndex={0}
        aria-label="Upload files"
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          className="hidden"
          data-testid="input-file-hidden"
        />

        <div
          className={cn(
            "w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-200",
            isDragging ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}
        >
          <Upload className="w-6 h-6" />
        </div>

        <div className="text-center">
          <p className="font-semibold text-sm">{label}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {description || `${multiple ? "Multiple files" : "Single file"} up to ${maxSizeMb}MB`}
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            inputRef.current?.click();
          }}
          data-testid="button-select-files"
        >
          Choose File{multiple ? "s" : ""}
        </Button>

        {isDragging && (
          <div className="absolute inset-0 rounded-md bg-primary/5 flex items-center justify-center">
            <div className="text-primary font-semibold text-sm">Drop files here</div>
          </div>
        )}
      </div>

      {hasFiles && (
        <div className="flex flex-col gap-2">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center gap-3 p-3 rounded-md border border-border bg-card"
              data-testid={`file-item-${index}`}
            >
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <File className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
              </div>
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              {onRemoveFile && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFile(index);
                  }}
                  aria-label={`Remove ${file.name}`}
                  data-testid={`button-remove-file-${index}`}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
