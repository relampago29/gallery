"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Dificulta a cópia/gravação das fotos em todo o site público (portfólio,
 * destaques, eventos, lightbox, trail da homepage...).
 *
 * - Bloqueia o menu de contexto (clique direito / long-press no Android)
 *   sobre imagens, o que remove "Copiar imagem", "Guardar imagem como" e
 *   "Abrir imagem num novo separador".
 * - Bloqueia o arrastar de imagens para fora do browser.
 * - Via CSS (classe `protect-images` no <body>): desliga o menu de
 *   long-press do iOS Safari (-webkit-touch-callout) e a seleção.
 *
 * O painel de administração fica de fora para não atrapalhar a gestão.
 *
 * Nota: isto é dissuasão, não proteção absoluta — quem souber usar as
 * ferramentas de programador ou fizer screenshot consegue sempre a imagem.
 */
export function isAdminPath(pathname: string | null) {
  if (!pathname) return false;
  return /^\/(?:[a-z]{2}\/)?admin(?:\/|$)/.test(pathname);
}

function hasBackgroundImage(el: Element) {
  const bg = window.getComputedStyle(el).backgroundImage;
  return !!bg && bg !== "none" && bg.includes("url(");
}

const IMAGE_SELECTOR =
  "img, picture, svg image, video, canvas, [data-protect-image]";

function isImageElement(el: Element) {
  return el.matches(IMAGE_SELECTOR) || !!el.closest(IMAGE_SELECTOR) || hasBackgroundImage(el);
}

function containsPoint(el: Element, x: number, y: number) {
  const r = el.getBoundingClientRect();
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}

/**
 * Verdadeiro se o alvo do evento for uma imagem, ou se houver uma imagem
 * por baixo do ponteiro (overlays/gradientes por cima da foto fazem com que
 * o alvo do clique não seja o próprio <img>).
 */
export function isImageTarget(
  target: EventTarget | null,
  x?: number,
  y?: number,
): boolean {
  if (target instanceof Element && isImageElement(target)) return true;
  if (
    typeof x === "number" &&
    typeof y === "number" &&
    typeof document.elementsFromPoint === "function"
  ) {
    const stack = document
      .elementsFromPoint(x, y)
      .filter((el) => el !== document.documentElement && el !== document.body);
    if (stack.some(isImageElement)) return true;
    // Imagens com `pointer-events: none` não aparecem no elementsFromPoint:
    // procurar dentro dos elementos sob o ponteiro uma imagem que o contenha.
    return stack.some((el) =>
      Array.from(el.querySelectorAll(IMAGE_SELECTOR)).some((img) =>
        containsPoint(img, x, y),
      ),
    );
  }
  return false;
}

export default function ImageProtection() {
  const pathname = usePathname();
  const enabled = !isAdminPath(pathname);

  useEffect(() => {
    if (!enabled) return;

    const body = document.body;
    body.classList.add("protect-images");

    const onContextMenu = (e: MouseEvent) => {
      if (isImageTarget(e.target, e.clientX, e.clientY)) e.preventDefault();
    };
    const onDragStart = (e: DragEvent) => {
      if (isImageTarget(e.target)) e.preventDefault();
    };

    document.addEventListener("contextmenu", onContextMenu, { capture: true });
    document.addEventListener("dragstart", onDragStart, { capture: true });

    return () => {
      body.classList.remove("protect-images");
      document.removeEventListener("contextmenu", onContextMenu, { capture: true });
      document.removeEventListener("dragstart", onDragStart, { capture: true });
    };
  }, [enabled]);

  return null;
}
