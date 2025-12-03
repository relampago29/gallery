"use client";

type NotificationAction = {
  label: string;
  onClick: () => void;
  variant?: "primary" | "ghost";
};

type NotificationProps = {
  type?: "success" | "error" | "warning" | "info" | "confirm";
  message: string;
  onClose?: () => void;
  actions?: NotificationAction[];
};

function tone(type: NotificationProps["type"]) {
  switch (type) {
    case "success":
      return { border: "border-emerald-400/40", bg: "bg-emerald-500/10", text: "text-emerald-100", pill: "bg-emerald-400/80 text-gray-900" };
    case "error":
      return { border: "border-red-400/40", bg: "bg-red-500/10", text: "text-red-100", pill: "bg-red-400/80 text-gray-900" };
    case "warning":
      return { border: "border-amber-400/40", bg: "bg-amber-500/10", text: "text-amber-100", pill: "bg-amber-400/80 text-gray-900" };
    case "confirm":
      return { border: "border-sky-400/40", bg: "bg-sky-500/10", text: "text-sky-100", pill: "bg-sky-400/80 text-gray-900" };
    default:
      return { border: "border-white/20", bg: "bg-white/10", text: "text-white", pill: "bg-white text-gray-900" };
  }
}

export function AdminNotification({ type = "info", message, onClose, actions }: NotificationProps) {
  const t = tone(type);
  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md animate-fade-in">
      <div className={`flex flex-col gap-3 rounded-2xl border ${t.border} ${t.bg} px-4 py-3 shadow-[0_20px_80px_rgba(0,0,0,0.4)] backdrop-blur-lg`}>
        <div className="flex items-start gap-3">
          <span className={`mt-0.5 inline-flex h-7 min-w-14 items-center justify-center rounded-full px-3 text-xs font-semibold ${t.pill}`}>
            {type === "success" ? "Sucesso" : type === "error" ? "Erro" : type === "warning" ? "Aviso" : "Info"}
          </span>
          <p className={`text-sm leading-relaxed ${t.text}`}>{message}</p>
          {onClose ? (
            <button type="button" onClick={onClose} aria-label="Fechar" className="ml-auto text-white/60 transition hover:text-white">
              ×
            </button>
          ) : null}
        </div>
        {actions && actions.length ? (
          <div className="flex flex-wrap gap-2">
            {actions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  action.variant === "primary" ? "bg-white text-gray-900 hover:bg-white/90" : "border border-white/25 text-white hover:bg-white/10"
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
