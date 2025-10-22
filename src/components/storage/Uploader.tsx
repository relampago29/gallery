"use client";
import React, { useCallback, useRef, useState } from "react";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  type UploadTask,
} from "firebase/storage";
import { storage, auth } from "@/lib/firebase/client";

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
      const task = uploadBytesResumable(storageRef, file, {
        contentType: file.type || undefined,
      });
      uploadRef.current = task;

      // Watchdog para detectar stuck a 0 B
      let watchdog: ReturnType<typeof setTimeout> | null = setTimeout(() => {
        setStatus((s) =>
          s.includes("Enviado 0 B")
            ? "A iniciar upload... verifique login/regras/bucket"
            : s
        );
      }, 15000);

      task.on(
        "state_changed",
        (snap) => {
          const pct = (snap.bytesTransferred / snap.totalBytes) * 100;
          setProgress(pct);
          // Se ficou em pausa, tenta retomar automaticamente
          if (snap.state === "paused") {
            try {
              task.resume();
            } catch {}
          }
          setStatus(
            `Enviado ${formatBytes(snap.bytesTransferred)} de ${formatBytes(
              snap.totalBytes
            )}`
          );
        },
        (err) => {
          const code = (err && (err.code || err.message)) as string;
          let msg = `Erro: ${err.message}`;
          if (typeof code === "string") {
            if (code.includes("storage/unauthorized")) {
              msg =
                "Sem permissões no Storage. Confirme login e regras (uploads/{uid}).";
            } else if (code.includes("storage/canceled")) {
              msg = "Upload cancelado.";
            } else if (code.includes("storage/retry-limit-exceeded")) {
              msg = "Ligação instável. Tenta novamente.";
            }
          }
          setStatus(msg);
          setCurrentFile(null);
          setProgress(0);
          if (watchdog) clearTimeout(watchdog);
        },
        async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          setStatus("Concluído.");
          onUploaded?.({ url, path });
          setCurrentFile(null);
          setProgress(100);
          if (watchdog) clearTimeout(watchdog);
        }
      );
    },
    [folder, onUploaded]
  );

  const startUploadViaApi = useCallback(
    async (file: File) => {
      setCurrentFile(file);
      setStatus("A enviar (via API)...");
      setProgress(0);

      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        setStatus("Sem sessão. Inicie sessão e tente novamente.");
        setCurrentFile(null);
        return;
      }

      await new Promise<void>((resolve, reject) => {
        const form = new FormData();
        form.append("file", file);
        form.append("name", file.name);

        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/upload");
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress((e.loaded / e.total) * 100);
            setStatus(
              `Enviado ${formatBytes(e.loaded)} de ${formatBytes(e.total)}`
            );
          }
        };
        xhr.onerror = () => {
          setStatus("Erro de rede (API)");
          setCurrentFile(null);
          setProgress(0);
          reject(new Error("network"));
        };
        xhr.onreadystatechange = async () => {
          if (xhr.readyState === 4) {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const data = JSON.parse(xhr.responseText);
                const path: string = data.path;
                let url: string | undefined;
                try {
                  url = await getDownloadURL(ref(storage, path));
                } catch {
                  // pode falhar se a rede bloquear GET; ainda assim devolvemos o path
                }
                setStatus("Concluído.");
                onUploaded?.({ url: url || "", path });
                setProgress(100);
                setCurrentFile(null);
                resolve();
              } catch (e) {
                setStatus("Erro a processar resposta do servidor");
                setCurrentFile(null);
                setProgress(0);
                reject(e as any);
              }
            } else {
              setStatus(`Erro API: ${xhr.status} ${xhr.statusText}`);
              setCurrentFile(null);
              setProgress(0);
              reject(new Error(xhr.responseText));
            }
          }
        };
        xhr.send(form);
      });
    },
    [onUploaded, folder]
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const useApi = process.env.NEXT_PUBLIC_UPLOAD_VIA_API === "true";
    const runner = useApi ? startUploadViaApi : startUpload;
    if (multiple) Array.from(files).forEach(runner);
    else runner(files[0]);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const useApi = process.env.NEXT_PUBLIC_UPLOAD_VIA_API === "true";
    if (useApi) startUploadViaApi(file);
    else startUpload(file);
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
