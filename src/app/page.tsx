import { oauthConfigured } from '@/features/github-auth/githubOAuthConfig';
import { Landing } from '@/features/sources/Landing';

export default async function HomePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="p-6">
      <Landing error={error ?? null} oauthConfigured={oauthConfigured()} />
    </div>
  );
}
