import { Providers } from "./providers";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-background text-on-surface min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
