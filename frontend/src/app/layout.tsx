'use client';
import { ReactNode } from 'react';
import { AuthProvider } from '@/lib/auth';
import './globals.css';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr">
      <head>
        <title>TEMSA BOM Entegrasyon</title>
        <meta name="description" content="PLM BOM → SAP Master BOM Dönüştürme Sistemi" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="antialiased relative">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
