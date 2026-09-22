import "./globals.css";
import AuthGate from "../components/AuthGate";

export const metadata = {
  title: "Calendário Acadêmico",
  description: "Montagem e validação interativa do calendário acadêmico",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}

