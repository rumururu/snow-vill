import type { Metadata, Viewport } from "next";
import { VillageStoreProvider } from "@/store/VillageStoreProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Snow Village — 친구들과 만드는 겨울 마을",
  description: "친구들의 작은 순간이 모여 하나의 겨울 마을이 됩니다. (M0 프로토타입)",
  // Public previews never include participant photos; M0 has no OG image yet.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#EAF1F5",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full">
        <VillageStoreProvider>
          <div id="app-root" className="min-h-dvh">
            {children}
          </div>
        </VillageStoreProvider>
      </body>
    </html>
  );
}
