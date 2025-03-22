import { APIGatewayTokenAuthorizerEvent, APIGatewayAuthorizerResult, StatementEffect } from 'aws-lambda';

export const basicAuthorizer = async (event: APIGatewayTokenAuthorizerEvent): Promise<APIGatewayAuthorizerResult> => {
  console.log('Event:', JSON.stringify(event));

  if (event.type !== 'TOKEN') {
    return generatePolicy('user', 'Deny' as StatementEffect, event.methodArn);
  }

  try {
    const authorizationToken = event.authorizationToken;
    const encodedCreds = authorizationToken.split(' ')[1];
    const buff = Buffer.from(encodedCreds, 'base64');
    const plainCreds = buff.toString('utf-8').split(':');
    const username = plainCreds[0];
    const password = plainCreds[1];

    const storedPassword = process.env[username];
    const effect = !storedPassword || storedPassword !== password ? 'Deny' as StatementEffect : 'Allow' as StatementEffect;

    return generatePolicy(username, effect, event.methodArn);
  } catch (error) {
    console.error('Error:', error);
    return generatePolicy('user', 'Deny' as StatementEffect, event.methodArn);
  }
};

const generatePolicy = (principalId: string, effect: StatementEffect, resource: string): APIGatewayAuthorizerResult => {
  return {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resource,
        },
      ],
    },
  };
}; 