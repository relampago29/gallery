"use client";
import React, { useCallback, useRef, useState } from "react";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  type UploadTask,
} from "firebase/storage";
import { storage } from "@/lib/firebase/client";

type UploaderProps = {
  /** Pasta de destino no Storage, e.g. "uploads" */
  folder?: string;
  /** Callback quando terminar: devolve URL público e caminho */
  onUploaded?: (data: { url: string; path: string }) => void;
  /** Aceitar múltiplos ficheiros */
  multiple?: boolean;
};

const toPath = (folder: string, name: string) =>
  folder.replace(/\/+$/, "") + "/" + name;

const formatBytes = (bytes: number) => {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"] as const;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const Uploader: React.FC<UploaderProps> = ({
  folder = "uploads",
  onUploaded,
  multiple = false,
}) => {
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<string>("");
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const uploadRef = useRef<UploadTask | null>(null);

  const startUpload = useCallback(
    (file: File) => {
      setCurrentFile(file);
      setStatus("A enviar...");
      setProgress(0);

      const path = toPath(folder, file.name);
      const storageRef = ref(storage, path);
      const task = uploadBytesResumable(storageRef, file);
      uploadRef.current = task;

      task.on(
        "state_changed",
        (snap) => {
          const pct = (snap.bytesTransferred / snap.totalBytes) * 100;
          setProgress(pct);
          setStatus(
            `Enviado ${formatBytes(snap.bytesTransferred)} de ${formatBytes(
              snap.totalBytes
            )}`
          );
        },
        (err) => {
          setStatus(`Erro: ${err.message}`);
          setCurrentFile(null);
          setProgress(0);
        },
        async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          setStatus("Concluído.");
          onUploaded?.({ url, path });
          setCurrentFile(null);
          setProgress(100);
        }
      );
    },
    [folder, onUploaded]
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (multiple) {
      Array.from(files).forEach(startUpload);
    } else {
      startUpload(files[0]);
    }
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) startUpload(file);
  };

  const cancel = () => {
    uploadRef.current?.cancel();
    setStatus("Cancelado.");
    setCurrentFile(null);
    setProgress(0);
  };

  return (
    <div>
      <div
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-base-200"
      >
        <input
          type="file"
          className="hidden"
          id="uploader-input"
          multiple={multiple}
          onChange={onInputChange}
        />
        <label htmlFor="uploader-input" className="block">
          <div className="text-sm opacity-70">Arraste ficheiros ou clique para selecionar</div>
          <div className="text-xs mt-1">Destino: {folder}</div>
        </label>
      </div>

      {status && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm">{currentFile ? currentFile.name : ""}</span>
            <span className="text-xs opacity-70">{status}</span>
          </div>
          <progress
            className="progress progress-primary w-full"
            value={progress}
            max={100}
          />
          <div className="mt-2 flex gap-2">
            {uploadRef.current && currentFile && (
              <button type="button" onClick={cancel} className="btn btn-sm">
                Cancelar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Uploader;

