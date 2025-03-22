import { APIGatewayProxyEvent } from "aws-lambda";
import { handler } from "../lambda/getProductsById";

describe("getProductsById", () => {
  it("should return product if found", async () => {
    const mockEvent = {
      pathParameters: {
        productId: "956ab963-4045-485c-9daf-4a2ca1495824",
      },
    } as unknown as APIGatewayProxyEvent;

    const result = await handler(mockEvent);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body).toHaveProperty("id", "956ab963-4045-485c-9daf-4a2ca1495824");
    expect(body).toHaveProperty("title", "TEST 1");
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
