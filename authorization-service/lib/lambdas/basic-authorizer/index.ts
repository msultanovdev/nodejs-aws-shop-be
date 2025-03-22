import {
  APIGatewayTokenAuthorizerEvent,
  APIGatewayAuthorizerResult,
  StatementEffect,
} from "aws-lambda";
import * as dotenv from "dotenv";

dotenv.config();

export const basicAuthorizer = async (
  event: APIGatewayTokenAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> => {
  console.log("Event:", JSON.stringify(event));

  if (event.type !== "TOKEN") {
    console.log("Invalid event type:", event.type);
    return generatePolicy(
      "user",
      "Deny" as StatementEffect,
      event.methodArn,
      "Invalid event type"
    );
  }

  try {
    const authorizationToken = event.authorizationToken;
    console.log("Authorization token:", authorizationToken);

    if (!authorizationToken) {
      console.log("Authorization header is missing");
      return generatePolicy(
        "user",
        "Deny" as StatementEffect,
        event.methodArn,
        "Authorization header is missing"
      );
    }

    if (!authorizationToken.startsWith("Basic ")) {
      console.log(
        'Invalid authorization token format. Expected "Basic" prefix'
      );
      return generatePolicy(
        "user",
        "Deny" as StatementEffect,
        event.methodArn,
        "Invalid authorization format"
      );
    }

    const encodedCreds = authorizationToken.split(" ")[1];
    const buff = Buffer.from(encodedCreds, "base64");
    const plainCreds = buff.toString("utf-8").split(":");

    if (plainCreds.length !== 2) {
      console.log("Invalid credentials format. Expected username:password");
      return generatePolicy(
        "user",
        "Deny" as StatementEffect,
        event.methodArn,
        "Invalid credentials format"
      );
    }

    const username = plainCreds[0];
    const password = plainCreds[1];
    console.log("Decoded credentials - Username:", username);

    const storedPassword = process.env[username];
    if (!storedPassword) {
      console.log("Username not found in environment variables");
      return generatePolicy(
        username,
        "Deny" as StatementEffect,
        event.methodArn,
        "Invalid credentials"
      );
    }

    const effect =
      storedPassword !== password
        ? ("Deny" as StatementEffect)
        : ("Allow" as StatementEffect);
    console.log("Authorization result:", effect);

    return generatePolicy(
      username,
      effect,
      event.methodArn,
      effect === "Allow" ? undefined : "Invalid credentials"
    );
  } catch (error) {
    console.error("Error processing authorization:", error);
    return generatePolicy(
      "user",
      "Deny" as StatementEffect,
      event.methodArn,
      "Error processing authorization"
    );
  }
};

const generatePolicy = (
  principalId: string,
  effect: StatementEffect,
  resource: string,
  message?: string
): APIGatewayAuthorizerResult => {
  const methodArn = resource;
  console.log("Generating policy for method:", methodArn);

  const response: APIGatewayAuthorizerResult = {
    principalId,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: effect,
          Resource: methodArn,
        },
      ],
    },
  };

  if (message) {
    response.context = {
      message,
      statusCode: message === "Authorization header is missing" ? "401" : "403",
    };
  }

  if (effect === "Allow") {
    response.context = {
      ...response.context,
      authorized: true,
      principalId,
      methodArn,
    };
  }

  return response;
};
