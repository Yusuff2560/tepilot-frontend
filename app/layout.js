export const metadata = {
  title: "TePilot",
  description: "AI Agent with browser control",
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
