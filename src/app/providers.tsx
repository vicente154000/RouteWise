"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
      <Toaster
        position="bottom-right"
        theme="system"
        richColors
        closeButton
        expand
      />
    </ThemeProvider>
  );
}
