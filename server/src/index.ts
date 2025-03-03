import { ApolloServer } from 'apollo-server-express';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { typeDefs } from './graphql/schema';
import { resolvers } from './graphql/resolvers';
import { authenticateToken } from './middleware/auth';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

const prisma = new PrismaClient();

// Define the context type for Apollo Server
interface Context {
  prisma: PrismaClient;
  user: { id: string; email: string; role: string } | null;
}

async function startServer() {
  const app = express();
  
  // Middleware
  app.use(cors());
  app.use(express.json());
  
  // Authentication middleware
  app.use(authenticateToken);
  
  // Apollo Server setup
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }): Context => {
      // Get the user from the request
      const user = req.user || null;
      return {
        prisma,
        user,
      };
    },
    introspection: process.env.NODE_ENV !== 'production',
  });
  
  await server.start();
  server.applyMiddleware({ app });
  
  const PORT = process.env.PORT || 4000;
  
  app.listen(PORT, () => {
    console.log(`🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`);
    console.log(`🔌 Connected to the database`);
  });
}

startServer().catch((err) => {
  console.error('Error starting server:', err);
});

export { prisma }; 