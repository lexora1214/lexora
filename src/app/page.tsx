
"use client";

import * as React from 'react';
import dynamic from 'next/dynamic';
import { LoaderCircle } from 'lucide-react';

const HomePageClient = dynamic(
  () => import('@/components/home-page-client'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex h-screen w-full items-center justify-center">
        <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
      </div>
    )
  }
);

export default function Home() {
  return <HomePageClient />;
}
