import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  S3Client,
} from '@aws-sdk/client-s3'

// ─── Singleton S3 Client ──────────────────────────────────────────────────────

const globalForS3 = globalThis as unknown as {
  s3Client: S3Client | undefined
}

export function getS3Client(): S3Client {
  if (globalForS3.s3Client) return globalForS3.s3Client

  const client = new S3Client({
    endpoint: process.env.S3_ENDPOINT ?? 'http://127.0.0.1:9000',
    region: process.env.S3_REGION ?? 'us-east-1',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY ?? 'minioadmin',
      secretAccessKey: process.env.S3_SECRET_KEY ?? 'minioadmin123',
    },
    // Required for MinIO path-style addressing (http://host:port/bucket/key)
    forcePathStyle: true,
  })

  if (process.env.NODE_ENV !== 'production') {
    globalForS3.s3Client = client
  }

  return client
}

// ─── Bucket Bootstrap ─────────────────────────────────────────────────────────

let bucketInitialized = false

/**
 * Ensure the application bucket exists and has the correct public-read policy.
 * Called lazily on first upload operation.
 */
export async function ensureBucket(): Promise<void> {
  if (bucketInitialized) return

  const client = getS3Client()
  const bucket = process.env.S3_BUCKET ?? 'scarbormusic'

  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }))
  } catch {
    // Bucket does not exist — create it
    await client.send(new CreateBucketCommand({ Bucket: bucket }))

    // Set public-read policy for media files (covers GET requests from any origin)
    const policy = JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${bucket}/*`],
        },
      ],
    })
    await client.send(new PutBucketPolicyCommand({ Bucket: bucket, Policy: policy }))
    console.warn(`[S3] Bucket "${bucket}" created with public-read policy`)
  }

  bucketInitialized = true
}

// ─── URL Builder ──────────────────────────────────────────────────────────────

export function getPublicUrl(objectKey: string): string {
  const base = (process.env.S3_PUBLIC_URL ?? 'http://127.0.0.1:9000/scarbormusic').replace(
    /\/$/,
    '',
  )
  return `${base}/${objectKey}`
}
