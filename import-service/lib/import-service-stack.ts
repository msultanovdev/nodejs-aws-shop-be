import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, "MyUploadBucketMs", {
      bucketName: "my-upload-bucket-ms",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    new s3deploy.BucketDeployment(this, "UploadFolder", {
      destinationBucket: bucket,
      destinationKeyPrefix: "uploaded",
      sources: [s3deploy.Source.asset("./empty-folder")],
    });

    new cdk.CfnOutput(this, "BucketName", {
      value: bucket.bucketName,
    });
  }
}
