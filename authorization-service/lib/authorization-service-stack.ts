import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

export class AuthorizationServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const githubUsername = "msultanovdev";

    const basicAuthorizerLambda = new lambda.Function(
      this,
      "BasicAuthorizerFunction",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "index.basicAuthorizer",
        code: lambda.Code.fromAsset("lib/lambdas/basic-authorizer"),
        environment: {
          [githubUsername]: "TEST_PASSWORD",
        },
      }
    );

    basicAuthorizerLambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["execute-api:Invoke"],
        resources: ["*"],
      })
    );
  }
}
