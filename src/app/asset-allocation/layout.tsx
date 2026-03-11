import type { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'AI Asset Allocation Planner',
  description:
    'Build a personalized, multi-asset allocation plan with AI based on return targets, risk profile, and investment horizon.',
  path: '/asset-allocation',
  keywords: ['asset allocation', 'portfolio planning', 'risk profile', 'investment strategy'],
});

export default function AssetAllocationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
