import swaggerUi from 'swagger-ui-express';

export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'WinterWear Core E-Commerce API',
    version: '1.0.0',
    description:
      'Production REST API for WinterWear luxury winter fashion brand. Features multi-warehouse inventory reservation, JWT authentication with token rotation, server-verified pricing, audit logging, and RBAC.',
    contact: {
      name: 'WinterWear Engineering Team',
      email: 'engineering@winterwear.pk',
    },
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API v1 Base',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT access token (obtained from /auth/login or /auth/register)',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Resource not found' },
          code: { type: 'string', example: 'NOT_FOUND' },
        },
      },
      User: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          email: { type: 'string' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          role: {
            type: 'string',
            enum: ['customer', 'admin', 'super_admin', 'inventory_manager', 'rider', 'fulfillment', 'customer_support', 'finance', 'marketing'],
          },
        },
      },
      Product: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string' },
          slug: { type: 'string' },
          regularPrice: { type: 'number' },
          salePrice: { type: 'number' },
          stockQuantity: { type: 'number' },
          isPublished: { type: 'boolean' },
          images: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                url: { type: 'string' },
                public_id: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
  security: [
    {
      BearerAuth: [],
    },
  ],
  paths: {
    '/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register new customer account (strictly creates customer role)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string', example: 'Zayn Malik' },
                  email: { type: 'string', example: 'zayn@example.com' },
                  password: { type: 'string', example: 'Winter2026!' },
                  phone: { type: 'string', example: '+923001234567' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Registered successfully. Returns user, accessToken and refreshToken.' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Authenticate with email & password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'customer@winterwear.pk' },
                  password: { type: 'string', example: 'Password123' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Authenticated successfully.' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Authentication'],
        summary: 'Rotate refresh token and retrieve new access token',
        responses: {
          200: { description: 'New token pair issued.' },
        },
      },
    },
    '/products': {
      get: {
        tags: ['Products'],
        summary: 'List products with filters, sorting, and pagination',
        parameters: [
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'sort', in: 'query', schema: { type: 'string', enum: ['newest', 'price-low', 'price-high', 'rating', 'bestseller'] } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 12 } },
        ],
        responses: {
          200: { description: 'Paginated product list.' },
        },
      },
    },
    '/products/{slug}': {
      get: {
        tags: ['Products'],
        summary: 'Get single product by slug including variants',
        parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Product and variants detail.' },
        },
      },
    },
    '/cart': {
      get: {
        tags: ['Cart'],
        summary: 'Get current user or guest cart (re-verifies prices from MongoDB)',
        responses: {
          200: { description: 'Cart contents with server-calculated subtotal.' },
        },
      },
    },
    '/cart/items': {
      post: {
        tags: ['Cart'],
        summary: 'Add item to cart',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['productId', 'size', 'color', 'quantity'],
                properties: {
                  productId: { type: 'string' },
                  sku: { type: 'string' },
                  size: { type: 'string', example: 'L' },
                  color: {
                    type: 'object',
                    properties: { name: { type: 'string' }, hex: { type: 'string' } },
                  },
                  quantity: { type: 'integer', example: 1 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Item added.' },
        },
      },
    },
    '/orders': {
      post: {
        tags: ['Orders'],
        summary: 'Checkout and create order with atomic inventory reservation',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['items', 'shippingAddress', 'paymentMethod'],
                properties: {
                  paymentMethod: { type: 'string', enum: ['COD', 'Stripe', 'Safepay', 'PayFast', 'Card'] },
                  couponCode: { type: 'string', example: 'WINTER20' },
                  shippingAddress: { type: 'object' },
                  items: { type: 'array', items: { type: 'object' } },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Order created.' },
        },
      },
    },
    '/orders/{orderNumber}/track': {
      get: {
        tags: ['Orders'],
        summary: 'Public tracking of an order',
        parameters: [
          { name: 'orderNumber', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'phone', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Order tracking timeline.' },
        },
      },
    },
    '/admin/analytics/overview': {
      get: {
        tags: ['Admin'],
        summary: 'Get core e-commerce business analytics (Admin/Finance only)',
        responses: {
          200: { description: 'Financial & operational overview metrics.' },
        },
      },
    },
  },
};

export const setupSwagger = (app) => {
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: 'WinterWear API Documentation',
      customCss: '.swagger-ui .topbar { background-color: #17191C; } .swagger-ui .topbar a span { color: #EDE7DC; font-family: Georgia, serif; }',
    })
  );
};
