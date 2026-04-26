export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Clinic Management API',
    version: '1.0.0',
    description: 'Backend API for clinic operations, appointments, queueing and records.'
  },
  servers: [{ url: '/api/v1' }],
  tags: [{ name: 'Health' }],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check endpoint',
        parameters: [
          {
            name: 'deep',
            in: 'query',
            required: false,
            schema: { type: 'boolean' },
            description: 'Runs deep checks including Redis ping.'
          }
        ],
        responses: {
          '200': {
            description: 'Healthy response'
          }
        }
      }
    }
  }
};
