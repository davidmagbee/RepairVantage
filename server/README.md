# RepairVantage - Server

Backend server for the RepairVantage repair management system.

## Technologies

- **Node.js** - JavaScript runtime
- **Express** - Web server framework
- **Apollo Server** - GraphQL server
- **Prisma** - ORM for database access
- **PostgreSQL** - Primary database
- **JWT** - Authentication mechanism
- **bcrypt** - Password hashing

## Getting Started

### Prerequisites

- Node.js (v16+)
- npm or yarn
- PostgreSQL database

### Installation

```
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev

# Start production server
npm start
```

## Database Setup

1. Set up your PostgreSQL database
2. Update the `.env` file with your database connection string
3. Run the initial migration: `npx prisma migrate dev --name init`

## Environment Variables

Create a `.env` file in the server root directory:

```
DATABASE_URL="postgresql://username:password@localhost:5432/repairvantage?schema=public"
JWT_SECRET="your-secret-key"
PORT=4000
NODE_ENV=development
```

## Project Structure

```
server/
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── migrations/      # Database migrations
├── src/
│   ├── graphql/         
│   │   ├── resolvers/   # GraphQL resolvers
│   │   └── typeDefs/    # GraphQL type definitions
│   ├── models/          # Data models
│   ├── services/        # Business logic
│   ├── utils/           # Utility functions
│   ├── middleware/      # Express middleware
│   └── index.ts         # Application entry point
├── .env                 # Environment variables
└── package.json         # Dependencies and scripts
```

## API Documentation

### GraphQL Endpoint

The GraphQL API is available at `/graphql` when the server is running. By default, this is `http://localhost:4000/graphql`.

### Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Development Roadmap

### Completed

- ✅ Initial project setup

### In Progress

- 🔄 Database schema design with Prisma
- 🔄 Basic server configuration

### Upcoming

- GraphQL schema definition
- Authentication implementation
- CRUD operations for all entities
- Business logic implementation
- API testing
- Performance optimization

## Deployment

### Production Build

```
npm run build
```

### Deployment Options

1. **Cloud Platforms**:
   - Heroku
   - DigitalOcean App Platform
   - AWS Elastic Beanstalk
   - Google Cloud Run

2. **Container-based Deployment**:
   - Docker container
   - Kubernetes cluster

3. **Traditional Hosting**:
   - VPS with Node.js installed
   - PM2 for process management

### Production Considerations

- Set `NODE_ENV=production` in your environment
- Use a process manager like PM2
- Consider using a reverse proxy like Nginx
- Implement rate limiting and security headers
- Set up database backups
