export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'SharePlate REST API',
    version: '1.0.0',
    description:
      'Food Rescue & Community Redistribution Platform API connecting Donors, Volunteers, NGOs, and Administrators.',
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API v1 Root',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'shareplate_token',
      },
    },
  },
  paths: {
    '/health': {
      get: {
        summary: 'Service health check',
        responses: { 200: { description: 'Service is operational' } },
      },
    },
    '/ready': {
      get: {
        summary: 'Database readiness probe',
        responses: { 200: { description: 'Database connected and ready' }, 503: { description: 'Database unavailable' } },
      },
    },
    '/auth/register': {
      post: {
        summary: 'Register a new user account with role selection',
        responses: { 201: { description: 'User registered' }, 409: { description: 'Email already exists' } },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Authenticate and receive JWT and session cookie',
        responses: { 200: { description: 'Authentication successful' }, 401: { description: 'Invalid credentials' } },
      },
    },
    '/auth/me': {
      get: {
        summary: 'Get current authenticated user profile',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        responses: { 200: { description: 'Current user data' } },
      },
    },
    '/listings': {
      get: {
        summary: 'Browse available food donations with search, categories, and pagination',
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'foodType', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
        ],
        responses: { 200: { description: 'Paginated food listings' } },
      },
      post: {
        summary: 'Create and publish a food donation listing',
        security: [{ bearerAuth: [] }],
        responses: { 201: { description: 'Listing created' } },
      },
    },
    '/listings/{id}/claims': {
      post: {
        summary: 'Atomically reserve quantity for an available food donation',
        security: [{ bearerAuth: [] }],
        responses: { 201: { description: 'Food claimed and QR code generated' } },
      },
    },
    '/pickups/verify': {
      post: {
        summary: 'Verify pickup and complete food handover via QR code scan or manual code',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Pickup verified and recorded' } },
      },
    },
  },
};
