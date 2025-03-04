# RepairVantage - Client

RepairVantage is a comprehensive repair management system that helps track projects, tasks, parts inventory, and repair scheduling.

## Technologies

- **React 18** - Frontend library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Build tool and development server
- **Apollo Client** - GraphQL client
- **TailwindCSS with DaisyUI** - Styling and UI components
- **React Router** - Client-side routing
- **date-fns** - Date manipulation library
- **Testing Library** - Component testing

## Getting Started

### Prerequisites

- Node.js (v16+)
- npm or yarn

### Installation

```
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Project Structure

```
client/
├── public/            # Static assets
├── src/
│   ├── components/    # Reusable UI components
│   ├── context/       # React context providers
│   ├── hooks/         # Custom React hooks
│   ├── pages/         # Page components
│   ├── services/      # API and service functions
│   ├── types/         # TypeScript type definitions
│   ├── utils/         # Utility functions
│   ├── App.tsx        # Main application component
│   └── main.tsx       # Application entry point
├── .eslintrc.js       # ESLint configuration
├── tsconfig.json      # TypeScript configuration
└── vite.config.ts     # Vite configuration
```

## Development Roadmap

### Completed

- ✅ Project setup with Vite, React, and TypeScript
- ✅ Basic dependency configuration
- ✅ Initial application structure

### In Progress

- 🔄 Frontend foundation with Apollo Client
- 🔄 TailwindCSS with DaisyUI setup
- 🔄 Basic layout and navigation components

### Upcoming

- Authentication UI
- Project Management UI
- Task Management UI
- Parts and Tools Management UI
- Calendar and Gantt Views
- Reporting and Export
- Testing and Refinement

## Deployment

### Build for Production

```
npm run build
```

This will create a `dist` directory with optimized production assets.

### Deployment Options

1. **Static Hosting Services**:
   - Netlify
   - Vercel
   - GitHub Pages
   - AWS S3 + CloudFront

2. **Container-based Deployment**:
   - Docker container with Nginx
   - Kubernetes cluster

3. **Manual Deployment**:
   - Copy the `dist` directory to your web server

## Environment Configuration

Create a `.env` file in the client root directory:

```
VITE_API_URL=http://localhost:4000/graphql
```

For production, set the correct API URL in your deployment environment.
