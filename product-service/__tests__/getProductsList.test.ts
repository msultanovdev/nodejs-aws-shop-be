import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../lambda/getProductsList';

describe('getProductsList', () => {
  it('should return statusCode 200 and list of products', async () => {
    const mockEvent = {} as APIGatewayProxyEvent;

    const result = await handler(mockEvent);

    expect(result.statusCode).toBe(200);
    expect(result.headers).toBeDefined();
    expect(result.body).toBeDefined();

    const body = JSON.parse(result.body);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);

    expect(body[0]).toHaveProperty('id');
    expect(body[0]).toHaveProperty('title');
    expect(body[0]).toHaveProperty('price');
  });
});
