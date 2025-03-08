import { handler } from "../lambda/parser";
import { S3 } from "aws-sdk";
import * as AWSMock from "aws-sdk-mock";
import { S3Event } from "aws-lambda";
import * as csv from "csv-parser";
import { Readable } from "stream";

jest.mock("csv-parser", () =>
  jest.fn(() =>
    Readable.from([
      { name: "Product1", price: 10, description: "Test", count: 5 },
    ])
  )
);

const mockS3Event: S3Event = {
  Records: [
    {
      s3: {
        bucket: { name: "my-aws-uploaded-bucket" },
        object: { key: "uploaded/test.csv" },
      },
    },
  ],
} as any;

describe("S3 Lambda Handler", () => {
  beforeEach(() => {
    AWSMock.mock("S3", "getObject", (params, callback) => {
      const stream = new Readable();
      stream.push("name,price,description,count\n");
      stream.push("Product1,10,Test,5\n");
      stream.push(null);
      callback(null, { Body: stream });
    });

    AWSMock.mock("S3", "copyObject", (params, callback) => {
      callback(null, {});
    });

    AWSMock.mock("S3", "deleteObject", (params, callback) => {
      callback(null, {});
    });
  });

  afterEach(() => {
    AWSMock.restore("S3");
  });

  it("should process S3 event and move file", async () => {
    console.log = jest.fn();
    await handler(mockS3Event);

    expect(console.log).toHaveBeenCalledWith(
      "Processing file: uploaded/test.csv"
    );
    expect(console.log).toHaveBeenCalledWith("Parsed record:", {
      name: "Product1",
      price: 10,
      description: "Test",
      count: 5,
    });
    expect(console.log).toHaveBeenCalledWith("File moved to: parsed/test.csv");
  });

  it("should handle errors when S3 getObject fails", async () => {
    AWSMock.remock("S3", "getObject", (params, callback) => {
      callback(new Error("S3 Error"), null);
    });

    console.error = jest.fn();
    await handler(mockS3Event);

    expect(console.error).toHaveBeenCalledWith(
      "Error processing event:",
      expect.any(Error)
    );
  });
});
