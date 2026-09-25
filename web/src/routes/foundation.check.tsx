import { createFileRoute } from '@tanstack/react-router';
import { FoundationPlaceholder } from '@/app/Placeholders';

export const Route = createFileRoute('/foundation/check')({
  component: FoundationPlaceholder,
});
