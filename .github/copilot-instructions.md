# Copilot Instructions for Kyswa Travel

## Overview
This project is a management system for a travel agency specializing in Omra and Hajj services. It consists of a frontend built with React and Vite, and a backend using Node.js and Express.

## Architecture
- **Frontend (clientKyswa)**: 
  - **Components**: Reusable UI components are located in `src/components/`.
  - **Pages**: Main views are organized in `src/pages/`.
  - **Services**: API calls are managed in `src/services/` using Axios.

- **Backend (serverKyswa)**:
  - **Controllers**: Business logic is handled in `controllers/`.
  - **Models**: Mongoose schemas are defined in `models/`.
  - **Routes**: API endpoints are defined in `routes/`.

## Developer Workflows
- **Running the Frontend**: Use `npm run dev` in the `clientKyswa` directory to start the Vite server.
- **Running the Backend**: Use `node index.js` in the `serverKyswa` directory to start the Express server.
- **Testing API**: Use the `/api/test` and `/api/health` endpoints to verify the backend is running correctly.

## Project Conventions
- **Environment Variables**: Use a `.env` file for sensitive configurations like `MONGO_URI`.
- **CORS Configuration**: The backend is set to allow requests from the frontend during development.

## Integration Points
- The frontend communicates with the backend through the `/api` routes, which are proxied in the Vite configuration.

## External Dependencies
- **Frontend**: React, Vite, Tailwind CSS, Axios.
- **Backend**: Express, Mongoose, dotenv, cors, helmet, morgan.

## Example Patterns
- **API Call**: Use Axios in `src/services/` to handle API requests.
- **State Management**: Use React Context API for managing global state in `src/context/`.

## Conclusion
These instructions should help AI agents understand the structure and workflows of the Kyswa Travel project effectively.