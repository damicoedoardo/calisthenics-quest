import type { ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Sprite Lab · FORMA', robots: { index: false } };

export default function LabLayout({ children }: { children: ReactNode }) {
  return children;
}
