import { ApolloClient, HttpLink, InMemoryCache, from } from '@apollo/client';
import { onError } from '@apollo/client/link/error';

export const privateOperation = { requiresSession: true };

export function createClient(onSessionExpired: () => void) {
  const sessionLink = onError(({ operation, graphQLErrors }) => {
    if (
      operation.getContext().requiresSession &&
      graphQLErrors?.some((error) => error.extensions?.code === 'UNAUTHENTICATED')
    ) {
      onSessionExpired();
    }
  });

  return new ApolloClient({
    link: from([sessionLink, new HttpLink({ uri: '/graphql', credentials: 'same-origin' })]),
    cache: new InMemoryCache(),
  });
}
