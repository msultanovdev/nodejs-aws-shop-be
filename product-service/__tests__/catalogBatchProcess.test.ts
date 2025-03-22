import { handler } from "../lambda/catalogBatchProcess";
import {
  DynamoDBDocumentClient,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { mockClient } from "aws-sdk-client-mock";

const dynamoMock = mockClient(DynamoDBDocumentClient);
const snsMock = mockClient(SNSClient);

describe("Catalog Batch Process", () => {
  beforeEach(() => {
    dynamoMock.reset();
    snsMock.reset();
    dynamoMock.on(TransactWriteCommand).resolves({});
    snsMock.on(PublishCommand).resolves({});
  });

  it("should successfully process an SQS event and write to DynamoDB", async () => {
    const mockEvent = {
      Records: [
        {
          messageId: "1",
          body: JSON.stringify({ title: "Product A", price: 100, count: 5 }),
        },
      ],
    };

    //@ts-ignore
    await expect(handler(mockEvent)).resolves.not.toThrow();
  });

  it("should handle invalid product data", async () => {
    const mockEvent = {
      Records: [
        {
          messageId: "2",
          body: JSON.stringify({ title: "", price: -5 }),
        },
      ],
    };

    //@ts-ignore
    await expect(handler(mockEvent)).rejects.toThrow(
      "Failed to process 1 records"
    );
  });

  it("should handle SNS publish failure", async () => {
    const mockEvent = {
      Records: [
        {
          messageId: "4",
          body: JSON.stringify({ title: "Product C", price: 300 }),
        },
      ],
    };

    snsMock.on(PublishCommand).rejects(new Error("SNS error"));

    //@ts-ignore
    await expect(handler(mockEvent)).resolves.not.toThrow();
  });
});
