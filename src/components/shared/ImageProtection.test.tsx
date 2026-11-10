import React from "react";
import { render, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, afterEach } from "vitest";

let mockPath = "/pt/portofolio";
vi.mock("next/navigation", () => ({ usePathname: () => mockPath }));

import ImageProtection, { isAdminPath, isImageTarget } from "./ImageProtection";

function setup() {
  return render(
    <div>
      <ImageProtection />
      <img data-testid="photo" src="/x.jpg" alt="" />
      <div data-testid="overlay-parent">
        <img src="/y.jpg" alt="" />
        <span data-testid="overlay">overlay</span>
      </div>
      <p data-testid="text">texto</p>
    </div>,
  );
}

describe("ImageProtection", () => {
  afterEach(() => {
    mockPath = "/pt/portofolio";
    document.body.className = "";
  });

  it("detects admin paths", () => {
    expect(isAdminPath("/pt/admin")).toBe(true);
    expect(isAdminPath("/en/admin/public/list")).toBe(true);
    expect(isAdminPath("/admin")).toBe(true);
    expect(isAdminPath("/pt/portofolio")).toBe(false);
    expect(isAdminPath("/pt/administrator-photos")).toBe(false);
  });

  it("blocks the context menu and drag on public images", () => {
    const { getByTestId } = setup();
    expect(document.body.classList.contains("protect-images")).toBe(true);
    // fireEvent returns false when preventDefault was called
    expect(fireEvent.contextMenu(getByTestId("photo"))).toBe(false);
    expect(fireEvent.dragStart(getByTestId("photo"))).toBe(false);
  });

  it("blocks the context menu on overlays that sit on top of a photo", () => {
    const { getByTestId } = setup();
    const photo = getByTestId("photo");
    const overlay = getByTestId("overlay");
    const original = document.elementsFromPoint;
    document.elementsFromPoint = () => [overlay, photo];
    try {
      expect(
        fireEvent.contextMenu(overlay, { clientX: 10, clientY: 10 }),
      ).toBe(false);
    } finally {
      document.elementsFromPoint = original;
    }
  });

  it("keeps the context menu on normal text", () => {
    const { getByTestId } = setup();
    expect(fireEvent.contextMenu(getByTestId("text"))).toBe(true);
    expect(isImageTarget(getByTestId("text"))).toBe(false);
  });

  it("is disabled in the admin panel", () => {
    mockPath = "/pt/admin/public/list";
    const { getByTestId } = setup();
    expect(document.body.classList.contains("protect-images")).toBe(false);
    expect(fireEvent.contextMenu(getByTestId("photo"))).toBe(true);
  });
});
