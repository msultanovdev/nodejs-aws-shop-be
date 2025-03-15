import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({});
const BUCKET_NAME = process.env.BUCKET_NAME || "my-aws-uploaded-bucket";

export const handler = async (event: any) => {
  const fileName = event.queryStringParameters?.name;

  if (!fileName) {
    return {
      statusCode: 400,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS, GET",
      },
      body: JSON.stringify({ message: "File name is required" }),
    };
  }

  if (!fileName.toLowerCase().endsWith(".csv")) {
    return {
      statusCode: 400,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: "Only CSV files are allowed" }),
    };
  }

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: `uploaded/${fileName}`,
    ContentType: "text/csv",
  });

  try {
    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 60 });

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS, GET",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: signedUrl }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS, GET",
      },
      body: JSON.stringify({ message: "Error generating URL", error }),
    };
  }
};
