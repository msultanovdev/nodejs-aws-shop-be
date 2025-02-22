import { APIGatewayProxyEvent } from "aws-lambda";
import { handler } from "../lambda/getProductsById";

describe("getProductsById", () => {
  it("should return product if found", async () => {
    const mockEvent = {
      pathParameters: {
        productId: "1",
      },
    } as unknown as APIGatewayProxyEvent;

    const result = await handler(mockEvent);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body).toHaveProperty("id", "1");
    expect(body).toHaveProperty("title", "Book One");
  });

  it("should return 404 if product not found", async () => {
    const mockEvent = {
      pathParameters: {
        productId: "999",
      },
    } as unknown as APIGatewayProxyEvent;

    const result = await handler(mockEvent);

    expect(result.statusCode).toBe(404);
    const body = JSON.parse(result.body);
    expect(body).toHaveProperty("message", "Product not found");
  });
});
