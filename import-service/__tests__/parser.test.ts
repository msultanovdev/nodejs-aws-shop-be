import {
  S3Client,
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { handler } from "../lambda/parser";
import { Readable } from "stream";
import { S3Event } from "aws-lambda";

jest.mock("@aws-sdk/client-s3");

const mockSend = jest.fn();
S3Client.prototype.send = mockSend;

describe("importFileParserHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should process CSV file, copy it to parsed folder, and delete the original", async () => {
    const csvData =
      "id,title,description,price,count\n1,Product A,Description A,10.99,5";
    const s3Event = {
      Records: [
        {
          s3: {
            bucket: { name: "test-bucket" },
            object: { key: "uploaded/test.csv" },
          },
        },
      ],
    };

    const mockS3Stream = Readable.from([csvData]);
    mockSend.mockImplementation((command) => {
      if (command instanceof GetObjectCommand) {
        return { Body: mockS3Stream };
      }
      return {};
    });

    await handler(s3Event as S3Event);

    expect(mockSend).toHaveBeenCalledWith(expect.any(GetObjectCommand));
    expect(mockSend).toHaveBeenCalledWith(expect.any(CopyObjectCommand));
    expect(mockSend).toHaveBeenCalledWith(expect.any(DeleteObjectCommand));
  });

  it("should log an error if an exception occurs", async () => {
    console.error = jest.fn();

    mockSend.mockRejectedValue(new Error("S3 error"));
    const s3Event = {
      Records: [
        {
          s3: {
            bucket: { name: "test-bucket" },
            object: { key: "uploaded/test.csv" },
          },
        },
      ],
    };

    await handler(s3Event as S3Event);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("Error handling S3 event:"),
      expect.any(Error)
    );
  });
});
