"""S3 storage service for file uploads."""
import boto3
from botocore.exceptions import ClientError
from app.core.config import settings


def get_s3_client():
    """Get configured S3 client."""
    if not settings.aws_access_key_id or not settings.aws_secret_access_key:
        raise ValueError("AWS credentials not configured")
    
    return boto3.client(
        's3',
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
        region_name=settings.aws_s3_region
    )


def upload_file_to_s3(file_content: bytes, filename: str, content_type: str = None) -> str:
    """
    Upload a file to S3.
    
    Args:
        file_content: File bytes
        filename: Target filename in S3 (e.g., 'receipts/order_123_abc.pdf')
        content_type: MIME type of the file
        
    Returns:
        The S3 key (filename) on success
        
    Raises:
        Exception on failure
    """
    client = get_s3_client()
    bucket = settings.aws_s3_bucket
    
    if not bucket:
        raise ValueError("S3 bucket not configured")
    
    extra_args = {}
    if content_type:
        extra_args['ContentType'] = content_type
    
    try:
        client.put_object(
            Bucket=bucket,
            Key=filename,
            Body=file_content,
            **extra_args
        )
        return filename
    except ClientError as e:
        raise Exception(f"Failed to upload to S3: {e}")


def download_file_from_s3(filename: str) -> bytes:
    """
    Download a file from S3.
    
    Args:
        filename: S3 key (e.g., 'receipts/order_123_abc.pdf')
        
    Returns:
        File content as bytes
        
    Raises:
        Exception on failure
    """
    client = get_s3_client()
    bucket = settings.aws_s3_bucket
    
    if not bucket:
        raise ValueError("S3 bucket not configured")
    
    try:
        response = client.get_object(Bucket=bucket, Key=filename)
        return response['Body'].read()
    except ClientError as e:
        if e.response['Error']['Code'] == 'NoSuchKey':
            raise FileNotFoundError(f"File not found in S3: {filename}")
        raise Exception(f"Failed to download from S3: {e}")


def delete_file_from_s3(filename: str) -> bool:
    """
    Delete a file from S3.
    
    Args:
        filename: S3 key (e.g., 'receipts/order_123_abc.pdf')
        
    Returns:
        True on success
        
    Raises:
        Exception on failure
    """
    client = get_s3_client()
    bucket = settings.aws_s3_bucket
    
    if not bucket:
        raise ValueError("S3 bucket not configured")
    
    try:
        client.delete_object(Bucket=bucket, Key=filename)
        return True
    except ClientError as e:
        raise Exception(f"Failed to delete from S3: {e}")


def file_exists_in_s3(filename: str) -> bool:
    """
    Check if a file exists in S3.
    
    Args:
        filename: S3 key
        
    Returns:
        True if exists, False otherwise
    """
    client = get_s3_client()
    bucket = settings.aws_s3_bucket
    
    if not bucket:
        return False
    
    try:
        client.head_object(Bucket=bucket, Key=filename)
        return True
    except ClientError:
        return False


def get_s3_url(filename: str, expires_in: int = 3600) -> str:
    """
    Generate a presigned URL for accessing a file.
    
    Args:
        filename: S3 key
        expires_in: URL expiration time in seconds (default 1 hour)
        
    Returns:
        Presigned URL string
    """
    client = get_s3_client()
    bucket = settings.aws_s3_bucket
    
    if not bucket:
        raise ValueError("S3 bucket not configured")
    
    try:
        url = client.generate_presigned_url(
            'get_object',
            Params={'Bucket': bucket, 'Key': filename},
            ExpiresIn=expires_in
        )
        return url
    except ClientError as e:
        raise Exception(f"Failed to generate presigned URL: {e}")
