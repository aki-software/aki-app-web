#!/bin/sh
set -eu

: "${SEAWEEDFS_REPORTS_BUCKET:?SEAWEEDFS_REPORTS_BUCKET is required}"
: "${SEAWEEDFS_DB_BACKUPS_BUCKET:?SEAWEEDFS_DB_BACKUPS_BUCKET is required}"

list_buckets() {
  printf '%s\n' 's3.bucket.list' |
    weed shell -master=seaweedfs:9333 -filer=seaweedfs:8888
}

ensure_bucket() {
  bucket="$1"

  if list_buckets | awk '{ print $1 }' | grep -Fx -- "$bucket" >/dev/null; then
    printf 'Bucket already exists: %s\n' "$bucket"
    return 0
  fi

  printf 's3.bucket.create -name %s\n' "$bucket" |
    weed shell -master=seaweedfs:9333 -filer=seaweedfs:8888
  printf 'Bucket created: %s\n' "$bucket"
}

until list_buckets >/dev/null 2>&1; do
  sleep 1
done

ensure_bucket "$SEAWEEDFS_REPORTS_BUCKET"
ensure_bucket "$SEAWEEDFS_DB_BACKUPS_BUCKET"
