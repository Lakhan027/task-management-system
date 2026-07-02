import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Task Management API",
      version: "1.0.0",
      description: "API documentation for Task Management System",
    },
    servers: [
      {
        url: "http://localhost:5000/api",
      },
    ],
  },

  apis: [
    "./src/routes/*.ts",
    "./src/controllers/*.ts",
  ],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;