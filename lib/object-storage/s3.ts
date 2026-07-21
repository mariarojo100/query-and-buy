/**
 * lib/object-storage/s3 — S3-compatible driver (MIGRATION FOUNDATION, not yet
 * in runtime use).
 * ===========================================================================
 * One implementation for Cloudflare R2, AWS S3, and MinIO — they differ only by
 * endpoint/credentials (env). `forcePathStyle` keeps MinIO and R2 happy.
 * Public reads are served from each bucket's R2 custom domain (keys.ts#
 * bucketPublicUrl); this driver only signs uploads and deletes.
 */
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { StorageDriver, PresignedUpload } from '@/lib/object-storage/driver'
import { bucketPublicUrl, type BucketName, type AllowedImageMime } from '@/lib/object-storage/keys'

export interface S3DriverConfig {
  endpoint: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  forcePathStyle?: boolean
}

const DEFAULT_PRESIGN_TTL = 60 // seconds

export class S3StorageDriver implements StorageDriver {
  private readonly client: S3Client

  constructor(config: S3DriverConfig) {
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
      forcePathStyle: config.forcePathStyle ?? true,
    })
  }

  async presignPut(input: {
    bucket: BucketName
    key: string
    contentType: AllowedImageMime
    expiresInSeconds?: number
  }): Promise<PresignedUpload> {
    const expiresIn = input.expiresInSeconds ?? DEFAULT_PRESIGN_TTL
    const cmd = new PutObjectCommand({
      Bucket: input.bucket,
      Key: input.key,
      ContentType: input.contentType,
    })
    const url = await getSignedUrl(this.client, cmd, { expiresIn })
    return {
      url,
      key: input.key,
      headers: { 'Content-Type': input.contentType },
      expiresInSeconds: expiresIn,
    }
  }

  async put(input: { bucket: BucketName; key: string; body: Uint8Array; contentType: string }): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: input.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
      }),
    )
  }

  async remove(input: { bucket: BucketName; key: string }): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: input.bucket, Key: input.key }))
  }

  publicUrl(bucket: BucketName, key: string): string {
    return bucketPublicUrl(bucket, key)
  }
}
