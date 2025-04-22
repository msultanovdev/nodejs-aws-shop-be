# BFF Service

Backend for Frontend Service that acts as a proxy between the frontend and various backend services.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env`:
```
PORT=3000
PRODUCT_SERVICE_URL=http://localhost:4000
CART_SERVICE_URL=http://localhost:5000
```

3. Start the service:
```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## Usage

The BFF service forwards requests to the appropriate service based on the URL path:

- Product Service: `http://localhost:3000/product/*`
- Cart Service: `http://localhost:3000/cart/*`

Example requests:
- Get products: `GET http://localhost:3000/product/products`
- Create cart: `POST http://localhost:3000/cart/carts`

The service will forward all query parameters, headers, and request body to the target service. 