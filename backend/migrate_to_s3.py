#!/usr/bin/env python3
"""
Script to migrate existing receipt files from local storage to AWS S3.
Run this inside the container: docker exec cns-api python /app/migrate_to_s3.py
"""
import os
import sys
from pathlib import Path

# Add app to path
sys.path.insert(0, '/app')

from app.core.config import settings
from app.services.storage import upload_file_to_s3


def migrate_receipts():
    """Migrate all receipt files from local storage to S3."""
    local_dir = Path("/app/uploads/receipts")
    
    if not local_dir.exists():
        print("No local receipts directory found. Nothing to migrate.")
        return
    
    files = list(local_dir.glob("*.*"))
    
    if not files:
        print("No files found to migrate.")
        return
    
    print(f"Found {len(files)} files to migrate to S3...")
    
    # Check S3 config
    if not settings.aws_s3_bucket:
        print("ERROR: AWS S3 bucket not configured!")
        return
    
    migrated = 0
    failed = 0
    
    for file_path in files:
        filename = file_path.name
        s3_key = f"receipts/{filename}"
        
        # Determine content type
        if filename.endswith('.pdf'):
            content_type = 'application/pdf'
        elif filename.endswith('.png'):
            content_type = 'image/png'
        else:
            content_type = 'image/jpeg'
        
        try:
            with open(file_path, 'rb') as f:
                file_content = f.read()
            
            upload_file_to_s3(file_content, s3_key, content_type)
            print(f"  ✓ Migrated: {filename} -> {s3_key}")
            migrated += 1
        except Exception as e:
            print(f"  ✗ Failed: {filename} - {e}")
            failed += 1
    
    print(f"\nMigration complete: {migrated} migrated, {failed} failed")
    
    if migrated > 0:
        print("\nNOTE: You need to update the database to use the new paths.")
        print("Run this SQL to update existing paths:")
        print("  UPDATE orders SET signed_receipt_path = 'receipts/' || signed_receipt_path WHERE signed_receipt_path IS NOT NULL AND signed_receipt_path NOT LIKE 'receipts/%';")


if __name__ == "__main__":
    migrate_receipts()
