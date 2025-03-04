# RepairVantage

RepairVantage is a comprehensive repair management system designed to help businesses track repair projects, manage tasks, inventory parts and tools, and schedule repairs efficiently.

## Project Overview

This project uses a modern tech stack with a Node.js/Express/GraphQL backend and a React/TypeScript frontend to create a full-featured repair management application.

## Repository Structure

```
repairvantage/
├── client/            # Frontend React application
│   ├── public/        # Static assets
│   ├── src/           # React source code
│   └── ...            # Configuration files
├── server/            # Backend Node.js application
│   ├── prisma/        # Database schema and migrations
│   ├── src/           # Server source code
│   └── ...            # Configuration files
├── .cursorrules       # Project development rules
└── README.md          # This file
```

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Apollo Client** for GraphQL integration
- **TailwindCSS** with DaisyUI for styling
- **React Router** for client-side routing
- **Testing Library** for component testing

### Backend
- **Node.js** with Express
- **Apollo Server** for GraphQL API
- **Prisma ORM** for database access
- **PostgreSQL** database
- **JWT** authentication
- **TypeScript** for type safety

## Getting Started

### Prerequisites
- Node.js (v16+)
- npm or yarn
- PostgreSQL database

### Installation

1. Clone the repository:
```
git clone https://github.com/yourusername/repairvantage.git
cd repairvantage
```

2. Install dependencies for both client and server:
```
# Install client dependencies
cd client
npm install

# Install server dependencies
cd ../server
npm install
```

3. Set up environment variables:
   - Create `.env` file in the server directory
   - Create `.env` file in the client directory

4. Set up the database:
```
cd server
npx prisma migrate dev
```

5. Start the development servers:
```
# In server directory
npm run dev

# In client directory (in a separate terminal)
cd ../client
npm run dev
```

## Development Roadmap

### Completed
- ✅ Project setup and initialization
- ✅ Basic project structure
- ✅ Frontend foundation with Vite and React
- ✅ Development environment configuration

### In Progress
- 🔄 Frontend UI foundation with TailwindCSS and DaisyUI
- 🔄 Database schema design with Prisma
- 🔄 Basic server configuration
- 🔄 GraphQL schema definition

### Upcoming
1. Authentication System
   - Backend JWT implementation
   - Frontend login/registration UI
   - Protected routes

2. Project Management
   - Project CRUD operations
   - Project listing and details views
   - Project assignment

3. Task Management
   - Task CRUD operations
   - Task status workflow
   - Drag-and-drop task board

4. Parts and Tools Inventory
   - Inventory management
   - Parts assignment to projects
   - Inventory forecasting

5. Calendar and Scheduling
   - Calendar view implementation
   - Gantt chart for project timelines
   - Resource allocation

6. Reporting
   - Cost tracking
   - Time analysis
   - Export functionality (PDF, CSV)

7. Testing and Refinement
   - Unit and integration testing
   - Performance optimization
   - UI/UX polish

## Contributing

1. Follow the development process guidelines in `.cursorrules`
2. Maintain the established project structure
3. Write tests for new features
4. Document all public functions and components

## License

[MIT License](LICENSE)
