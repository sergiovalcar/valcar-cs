import './globals.css';
import Sidebar from '@/components/Sidebar';

export const metadata = {
  title: 'Valcar CS — Customer Success',
  description: 'Sistema de Customer Success da Valcar Consórcios',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="ml-[260px] flex-1 p-8 min-h-screen">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
