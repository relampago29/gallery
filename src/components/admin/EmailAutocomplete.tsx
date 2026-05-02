"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { auth } from "@/lib/firebase/client";

type UserSuggestion = {
  uid: string;
  email: string;
  displayName: string | null;
};

interface EmailAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Called when the user presses Enter or clicks a suggestion */
  onSubmit?: (email: string) => void;
}

export function EmailAutocomplete({
  value,
  onChange,
  placeholder = "email@exemplo.com",
  disabled = false,
  onSubmit,
}: EmailAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      const res = await fetch(
        `/api/users/search?q=${encodeURIComponent(q)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) return;
      const data = await res.json();
      const list: UserSuggestion[] = data.users ?? [];
      setSuggestions(list);
      setOpen(list.length > 0);
      setActiveIndex(-1);
    } catch {
      // silently ignore
    }
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 220);
  }

  function pick(email: string) {
    onChange(email);
    setSuggestions([]);
    setOpen(false);
    setActiveIndex(-1);
    onSubmit?.(email);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      if (activeIndex >= 0) {
        e.preventDefault();
        pick(suggestions[activeIndex].email);
      } else {
        setOpen(false);
        onSubmit?.(value);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  // Close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={containerRef} className="relative flex-1">
      <input
        className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-white/40 focus:outline-none disabled:opacity-50"
        placeholder={placeholder}
        type="email"
        autoComplete="off"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        disabled={disabled}
      />

      {open && suggestions.length > 0 && (
        <ul className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-xl border border-white/15 bg-[#111] shadow-2xl">
          {suggestions.map((s, i) => (
            <li
              key={s.uid}
              onMouseDown={() => pick(s.email)}
              className={`flex cursor-pointer flex-col px-3 py-2 text-sm transition ${
                i === activeIndex
                  ? "bg-white/15 text-white"
                  : "text-white/80 hover:bg-white/10"
              }`}
            >
              <span>{s.email}</span>
              {s.displayName && (
                <span className="text-[11px] text-white/40">{s.displayName}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
