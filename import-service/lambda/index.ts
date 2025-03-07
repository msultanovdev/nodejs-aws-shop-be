import { S3 } from "aws-sdk";

const s3 = new S3();
const BUCKET_NAME = process.env.BUCKET_NAME || "my-aws-uploaded-bucket";

exports.handler = async (event: any) => {
  const fileName = event.queryStringParameters?.name;

  if (!fileName) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "File name is required" }),
    };
  }

  const params = {
    Bucket: BUCKET_NAME,
    Key: `uploaded/${fileName}`,
    Expires: 60,
    ContentType: "text/csv",
  };

  try {
    const signedUrl = await s3.getSignedUrlPromise("putObject", params);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: signedUrl }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error generating URL", error }),
    };
  }
};
