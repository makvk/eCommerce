using ECommerce.Application.Common;
using ECommerce.Infrastructure.Options;
using Microsoft.Extensions.Options;
using Minio;
using Minio.DataModel.Args;
using Minio.Exceptions;

namespace ECommerce.Infrastructure.Services;

public class MinioFileStorageService(IMinioClient minioClient, IOptions<MinioOptions> options) : IFileStorageService
{
    private static readonly SemaphoreSlim BucketInitLock = new(1, 1);
    private static bool _bucketReady;

    private readonly IMinioClient _minioClient = minioClient;
    private readonly MinioOptions _options = options.Value;

    public async Task<string> UploadAsync(
        Stream content,
        string objectName,
        string contentType,
        CancellationToken cancellationToken)
    {
        await EnsureBucketExistsAsync(cancellationToken);

        var putArgs = new PutObjectArgs()
            .WithBucket(_options.BucketName)
            .WithObject(objectName)
            .WithStreamData(content)
            .WithObjectSize(content.Length)
            .WithContentType(contentType);

        await _minioClient.PutObjectAsync(putArgs, cancellationToken);

        return $"{_options.PublicBaseUrl.TrimEnd('/')}/{_options.BucketName}/{objectName}";
    }

    public async Task DeleteAsync(string fileUrl, CancellationToken cancellationToken)
    {
        var objectName = ExtractObjectName(fileUrl);
        if (objectName is null)
            return;

        try
        {
            var removeArgs = new RemoveObjectArgs().WithBucket(_options.BucketName).WithObject(objectName);
            await _minioClient.RemoveObjectAsync(removeArgs, cancellationToken);
        }
        catch (ObjectNotFoundException)
        {
            // Файла уже нет — цель удаления и так достигнута.
        }
    }

    private async Task EnsureBucketExistsAsync(CancellationToken cancellationToken)
    {
        if (_bucketReady)
            return;

        await BucketInitLock.WaitAsync(cancellationToken);
        try
        {
            if (_bucketReady)
                return;

            var existsArgs = new BucketExistsArgs().WithBucket(_options.BucketName);
            var exists = await _minioClient.BucketExistsAsync(existsArgs, cancellationToken);
            if (!exists)
            {
                var makeArgs = new MakeBucketArgs().WithBucket(_options.BucketName);
                await _minioClient.MakeBucketAsync(makeArgs, cancellationToken);
            }

            // Картинки товаров не приватные — раздаём анонимный доступ на чтение,
            // чтобы фронтенд мог грузить их напрямую по ImageUrl без подписанных ссылок.
            var policy = $$"""
                {
                  "Version": "2012-10-17",
                  "Statement": [
                    {
                      "Effect": "Allow",
                      "Principal": {"AWS": ["*"]},
                      "Action": ["s3:GetObject"],
                      "Resource": ["arn:aws:s3:::{{_options.BucketName}}/*"]
                    }
                  ]
                }
                """;
            var setPolicyArgs = new SetPolicyArgs().WithBucket(_options.BucketName).WithPolicy(policy);
            await _minioClient.SetPolicyAsync(setPolicyArgs, cancellationToken);

            _bucketReady = true;
        }
        finally
        {
            BucketInitLock.Release();
        }
    }

    private string? ExtractObjectName(string fileUrl)
    {
        var marker = $"/{_options.BucketName}/";
        var idx = fileUrl.IndexOf(marker, StringComparison.Ordinal);
        return idx < 0 ? null : fileUrl[(idx + marker.Length)..];
    }
}
