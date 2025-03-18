import { handler } from "../lambda/catalogBatchProcess";
import { DynamoDBDocumentClient, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { mockClient } from "aws-sdk-client-mock";
import { v4 as uuidv4 } from "uuid";

jest.mock("uuid", () => ({ v4: jest.fn(() => "mocked-uuid") }));

const dynamoMock = mockClient(DynamoDBDocumentClient);
const snsMock = mockClient(SNSClient);

describe("Lambda SQS Handler", () => {
  beforeEach(() => {
    dynamoMock.reset();
    snsMock.reset();
  });

  it("should process SQS event and write to DynamoDB", async () => {
    const event = {
      Records: [
        {
          body: JSON.stringify({ title: "Test Product", price: 100, count: 10 }),
        },
      ],
    };

    dynamoMock.on(TransactWriteCommand).resolves({});
    snsMock.on(PublishCommand).resolves({});

    //@ts-ignore
    await handler(event);

    expect(dynamoMock.calls()).toHaveLength(1);
    expect(dynamoMock.calls()[0].args[0].input).toMatchObject({
      TransactItems: [
        { Put: { TableName: expect.any(String), Item: expect.objectContaining({ id: "mocked-uuid" }) } },
        { Put: { TableName: expect.any(String), Item: { product_id: "mocked-uuid", count: 10 } } },
      ],
    });
    expect(snsMock.calls()).toHaveLength(1);
  });

  it("should log an error for invalid product data", async () => {
    console.error = jest.fn();
    const event = {
      Records: [
        {
          body: JSON.stringify({ title: "", price: -100 }),
        },
      ],
    };

    //@ts-ignore
    await handler(event);

    expect(console.error).toHaveBeenCalledWith("Invalid product data:", expect.any(Object));
  });

  it("should handle SNS publish failure gracefully", async () => {
    console.error = jest.fn();
    const event = {
      Records: [
        {
          body: JSON.stringify({ title: "Test Product", price: 100, count: 10 }),
        },
      ],
    };

    dynamoMock.on(TransactWriteCommand).resolves({});
    snsMock.on(PublishCommand).rejects(new Error("SNS error"));

    //@ts-ignore
    await handler(event);

    expect(console.error).toHaveBeenCalledWith("Error sending SNS notification:", expect.any(Error));
  });
});
