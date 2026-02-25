"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Loader2Icon } from "lucide-react";
import { extractTextFromPDF } from "@/lib/pdf-parser";

interface FileUploadProps {
  onTextExtracted: (text: string) => void;
  disabled?: boolean;
}

export function FileUpload({ onTextExtracted, disabled }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      alert("Please select a PDF file");
      return;
    }

    setIsProcessing(true);
    try {
      const text = await extractTextFromPDF(file);
      onTextExtracted(text);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to extract text from PDF";
      alert(message);
    } finally {
      setIsProcessing(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileSelect}
        disabled={disabled || isProcessing}
        className="hidden"
        id="pdf-upload"
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || isProcessing}
        className="w-full sm:w-auto"
      >
        {isProcessing ? (
          <>
            <Loader2Icon className="animate-spin" />
            Processing PDF...
          </>
        ) : (
          <>
            <FileText className="size-4" />
            Upload PDF
          </>
        )}
      </Button>
    </div>
  );
}
