import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const bucket = process.env.S3_BUCKET;
const client = bucket ? new S3Client({ region: process.env.AWS_REGION }) : null;
// ponytail: S3 설정이 없을 때 쓰는 로컬 저장. 만료 삭제는 서버의 purgeExpiredPhotos가 맡는다.
const localDir = new URL("../../.local/uploads/", import.meta.url).pathname;
const localPath = (key: string) => join(localDir, key.replaceAll("/", "_"));

export async function savePhoto(key: string, body: Buffer) {
  if (client) {
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: "image/jpeg" }));
    return;
  }
  mkdirSync(localDir, { recursive: true });
  writeFileSync(localPath(key), body);
}

export async function photoUrl(photoId: string, key: string, runId: string) {
  if (!client) return `/api/runs/${runId}/photos/${photoId}`;
  return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 3600 });
}

export const readLocalPhoto = (key: string) => readFileSync(localPath(key));

export async function deletePhoto(key: string) {
  if (client) await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  else rmSync(localPath(key), { force: true });
}
