import { ApolloClient, HttpLink, InMemoryCache, from } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { ELIGIBILITY_REQUIRED_EVENT } from '../context/eligibility';

export const privateOperation = { requiresSession: true };

export function createClient(onSessionExpired: () => void) {
  const sessionLink = onError(({ operation, graphQLErrors }) => {
    // A policy change invalidates eligibility without misclassifying a still-valid identity as signed out.
    if (operation.getContext().requiresSession && graphQLErrors?.some(error => error.extensions?.code === 'ELIGIBILITY_REQUIRED')) {
      window.dispatchEvent(new Event(ELIGIBILITY_REQUIRED_EVENT));
    }
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
