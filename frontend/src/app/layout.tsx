import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import { AuthModal } from '../components/AuthModal';

export const metadata: Metadata = {
  title: 'EcoVision AI — Intelligent Waste Detection & Smart Segregation',
  description:
    'Full-stack environmental technology platform for automated multi-object waste detection, smart segregation, and circular economy intelligence.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-charcoal-950 text-slate-100 flex flex-col antialiased selection:bg-eco-500 selection:text-charcoal-950">
        <AuthProvider>
          {children}
          <AuthModal />
        </AuthProvider>
      </body>
    </html>
  );
}
