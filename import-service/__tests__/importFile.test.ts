import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { handler } from "../lambda/index";

jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn(),
  })),
  PutObjectCommand: jest.fn(),
}));

jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: jest.fn(),
}));

describe("importProductsFile lambda", () => {
  beforeEach(() => {
    (getSignedUrl as jest.Mock).mockResolvedValue("https://signed-url.com");
  });

  it("should return signed URL when filename is provided", async () => {
    const event = {
      queryStringParameters: { name: "test.csv" },
    } as any;

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(result.body).toContain("https://signed-url.com");
  });

  it("should return 400 when filename is not provided", async () => {
    const event = { queryStringParameters: {} } as any;

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
  });
});
