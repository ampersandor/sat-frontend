# SAT Frontend

This is the frontend application for the SAT (Sequence Alignment Tool) system, built with React + TypeScript + Vite.

## Environment Variables

Create a `.env` file in the project root with the following variables:

```bash
# API Configuration
VITE_API_URL=http://localhost:8080/api/v1

# SSE Configuration
VITE_SSE_RECONNECT_DELAY=5000

# File Upload Configuration
VITE_MAX_FILE_SIZE=104857600

# Development Server Configuration (optional)
VITE_PORT=5173
VITE_HOST=localhost
```

## API Architecture

The frontend follows a layered architecture for API communication:

1. **API Client Layer** (`apiClient.ts`): Centralized HTTP client with error handling
2. **Service Layer** (`*Service.ts`): Domain-specific services (artifacts, jobs, analysis, health)
3. **Legacy Wrapper** (`api.ts`): Backward-compatible API functions for existing components

### Key Features:

- Centralized error handling with `ApiError` type
- TypeScript DTOs matching backend API specification
- Server-Sent Events (SSE) support with automatic reconnection
- File upload/download with progress tracking
- Health check integration

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint
```

## Project Structure

```
src/
  services/        # API services and client
    apiClient.ts   # Base API client with error handling
    artifactService.ts  # File upload/download operations
    analysisService.ts  # Alignment job operations
    jobService.ts      # Job listing and SSE monitoring
    healthService.ts   # Server health checks
    api.ts            # Legacy API wrapper (to be deprecated)
  types/          # TypeScript type definitions
  components/     # React components
  App.tsx        # Main application component
  main.tsx       # Application entry point
```

## API Integration

The application integrates with the SAT backend API v1. Key endpoints:

- **File Management**: Upload, download, and list files
- **Alignment Processing**: Start alignment jobs with various tools (MAFFT, UCLUST, VSEARCH)
- **Job Management**: Monitor job status in real-time via Server-Sent Events
- **Health Check**: Verify backend server availability

Refer to `.cursor/rules/API_SPECIFICATION.md` for detailed API documentation.

## Migration Notes

The API layer has been refactored to follow the sat-rule guidelines:

1. **New Types**: Use `ArtifactDto`, `JobDto`, etc. instead of legacy types
2. **Service Pattern**: Use service classes directly for new features
3. **Error Handling**: Utilize `ApiClientError` and `handleApiError` utilities
4. **Environment Variables**: Update from `VITE_API_BASE_URL` to `VITE_API_URL`

Legacy components continue to work through the wrapper functions in `api.ts`, but new features should use the service classes directly.