import { useCallback, useState, useRef } from 'react';
import { Upload, File, X, CheckCircle, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatBytes } from '@/lib/pdf-utils';
import { DEFAULT_MAX_FILE_SIZE_MB, mbToBytes } from '@/lib/upload-limits';

interface FileUploadProps {
  accept?: string;
  multiple?: boolean;
  maxSizeMb?: number;
  onFiles: (files: File[]) => void;
  onError?: (rejectedCount: number) => void;
  onValidationError?: (message: string) => void;
  files?: File[];
  onRemoveFile?: (index: number) => void;
  onReorderFiles?: (files: File[]) => void;
  label?: string;
  description?: string;
  selectLabel?: string;
}

export function FileUpload({
  accept = '.pdf',
  multiple = false,
  maxSizeMb = DEFAULT_MAX_FILE_SIZE_MB,
  onFiles,
  onError,
  onValidationError,
  files = [],
  onRemoveFile,
  onReorderFiles,
  label = 'Drop your PDF here',
  description,
  selectLabel = 'Choose File',
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else {
      setIsDragging(false);
    }
  }, []);

  const processFiles = useCallback(
    (newFiles: FileList | null) => {
      if (!newFiles) return;
      let rejected = 0;
      const arr = Array.from(newFiles).filter((f) => {
        const acceptTypes = accept.split(',').map((a) => a.trim());
        const matches = acceptTypes.some((a) => {
          if (a.startsWith('.')) return f.name.toLowerCase().endsWith(a);
          return f.type.startsWith(a.replace('*', ''));
        });
        const sizeOk = f.size <= mbToBytes(maxSizeMb);
        if (!matches || !sizeOk) rejected++;
        return matches && sizeOk;
      });
      if (rejected > 0 && onError) onError(rejected);
      onValidationError?.(
        rejected > 0
          ? `Some files were rejected — check format (${accept}) or size limit (${maxSizeMb}MB).`
          : '',
      );
      onFiles(arr);
    },
    [accept, maxSizeMb, onFiles, onError, onValidationError],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      processFiles(e.dataTransfer.files);
    },
    [processFiles],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      processFiles(e.target.files);
      e.target.value = '';
    },
    [processFiles],
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
          'relative flex min-h-[230px] flex-col items-center justify-center gap-3 rounded-[20px] border-2 border-dashed p-6 cursor-pointer transition-all duration-200 sm:p-8',
          isDragging
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : 'border-border hover:border-primary/50 hover:bg-accent/40',
          hasFiles && 'border-primary/30 bg-primary/3',
        )}
        data-testid="dropzone-file-upload"
        role="button"
        tabIndex={0}
        aria-label="Upload files"
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
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
            'flex size-14 items-center justify-center rounded-2xl transition-all duration-200',
            isDragging ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
          )}
        >
          <Upload className="w-6 h-6" />
        </div>

        <div className="text-center">
          <p className="text-base font-bold sm:text-lg">{label}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {description || `${multiple ? 'Multiple files' : 'Single file'} up to ${maxSizeMb}MB`}
          </p>
        </div>

        <Button
          size="lg"
          type="button"
          className="mt-1 min-w-48 rounded-xl px-6 font-bold"
          onClick={(e) => {
            e.stopPropagation();
            inputRef.current?.click();
          }}
          data-testid="button-select-files"
        >
          {selectLabel}
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
              {onReorderFiles && files.length > 1 && (
                <>
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={index === 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      const next = [...files];
                      [next[index - 1], next[index]] = [next[index], next[index - 1]];
                      onReorderFiles(next);
                    }}
                    aria-label={`Move ${file.name} up`}
                    data-testid={`button-move-up-${index}`}
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={index === files.length - 1}
                    onClick={(e) => {
                      e.stopPropagation();
                      const next = [...files];
                      [next[index + 1], next[index]] = [next[index], next[index + 1]];
                      onReorderFiles(next);
                    }}
                    aria-label={`Move ${file.name} down`}
                    data-testid={`button-move-down-${index}`}
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </Button>
                </>
              )}
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
