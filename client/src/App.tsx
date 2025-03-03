import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ApolloClient, InMemoryCache, ApolloProvider, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

// Pages
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import Projects from './pages/Projects';
import ProjectDetails from './pages/ProjectDetails';
import Tasks from './pages/Tasks';
import Inventory from './pages/Inventory';
import Calendar from './pages/Calendar';
import NotFound from './pages/NotFound';

// Components
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';

// Create HTTP link
const httpLink = createHttpLink({
  uri: 'http://localhost:4000/graphql',
});

// Auth link middleware
const authLink = setContext((_, { headers }) => {
  // Get the authentication token from local storage if it exists
  const token = localStorage.getItem('token');
  // Return the headers to the context so httpLink can read them
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    }
  };
});

// Create Apollo Client
const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache()
});

function App() {
  return (
    <ApolloProvider client={client}>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="projects" element={<PrivateRoute><Projects /></PrivateRoute>} />
            <Route path="projects/:id" element={<PrivateRoute><ProjectDetails /></PrivateRoute>} />
            <Route path="tasks" element={<PrivateRoute><Tasks /></PrivateRoute>} />
            <Route path="inventory" element={<PrivateRoute><Inventory /></PrivateRoute>} />
            <Route path="calendar" element={<PrivateRoute><Calendar /></PrivateRoute>} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Router>
    </ApolloProvider>
  );
}

export default App; 