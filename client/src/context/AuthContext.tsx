import { ApolloProvider } from '@apollo/client';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { createClient } from '../graphql/client';
import { authClient } from './auth-client';

export function useAuth() {
  const { data, error, isPending, refetch } = authClient.useSession();
  return {
    user: !error && data?.user.emailVerified ? data.user : null,
    loading: isPending,
    error: Boolean(error),
    retry: () => { void refetch(); },
  };
}

function ApolloSession({ children }: { children: ReactNode }) {
  const { retry } = useAuth();
  const [client] = useState(() => createClient(retry));
  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  // A session transition gets a new cache, isolating delayed responses from the previous identity.
  return <ApolloSession key={user?.id ?? 'guest'}>{children}</ApolloSession>;
}
