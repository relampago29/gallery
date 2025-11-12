import { render as rtlRender, RenderOptions } from '@testing-library/react';
import React, { ReactElement } from 'react';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function render(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return rtlRender(ui, { wrapper: Wrapper, ...options });
}

export * from '@testing-library/react';

