import { Construct } from "constructs";
import * as path from "path";
import { sync as glob } from "glob";
import { lookup as mime } from "mime-types";
import { App, TerraformStack, TerraformOutput } from "cdktf";
import { AwsProvider, s3 } from "@cdktf/provider-aws"

class MyStack extends TerraformStack {
  constructor(scope: Construct, name: string) {
    super(scope, name);

    // AWS Provider
    new AwsProvider(this, 'AWS', {
      region: "us-west-2",
    });
    // Bucket
    const cobucket = new s3.S3Bucket(this, "cobus-website-bucket", {
      bucket: "cobus-website-bucket",
    });
    // Configure the bucket for a website
    new s3.S3BucketWebsiteConfiguration(this, "cobus-websiteconfig", {
      bucket: cobucket.bucket,
      indexDocument: {
        suffix: "index.html"
      },
      errorDocument: {
        key: "error.html"
      },
    });
    // Open up the bucket
    new s3.S3BucketPolicy(this, "cobus-policy", {
      bucket: cobucket.bucket,
      policy: JSON.stringify({
        Version: "2012-10-17",
        Id: "public-website-access",
        Statement: [
          {
            Sid: "PublicRead",
            Effect: "Allow",
            Principal: "*",
            Action: ["s3:GetObject"],
            Resource: [`${cobucket.arn}/*`, `${cobucket.arn}`],
          },
        ],
      }),
    });
    // Add files
    const absolutePath = path.resolve(__dirname, "website/");
    const files = glob("**/*.html", {
      cwd: path.resolve(__dirname, "website/"),
    });

    // file loop
    files.forEach((f) => {
      const filePath = path.join(absolutePath, f);

      new s3.S3Object(this, `${f}`, {
        bucket: cobucket.bucket,
        key: f,
        source: filePath,
        contentType: mime(path.extname(f)) || "text/html",
      });
    });

    // outputs
    new TerraformOutput(this, 'bucketname', {
      value: cobucket.bucket,
    });
  }
}

const app = new App();
new MyStack(app, "staticwebsite-with-cdktf");
app.synth();
