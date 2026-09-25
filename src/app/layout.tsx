import type { Metadata } from "next";
import { Suspense } from "react";
import { WireframePreviewBridge } from "@/components/wireframe-preview-bridge";
import "./globals.css";

export const metadata: Metadata = {
  title: "Presentation",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
      <Suspense>
        <WireframePreviewBridge />
      </Suspense>
    </html>
  );
}
