namespace ECommerce.Infrastructure.Options;

public class MinioOptions
{
    /// <summary>Адрес MinIO для запросов из бэкенда (внутри docker-сети — "ecommerce-minio:9000").</summary>
    public string Endpoint { get; init; } = "localhost:9000";
    public string AccessKey { get; init; } = "minioadmin";
    public string SecretKey { get; init; } = "minioadmin";
    public string BucketName { get; init; } = "product-images";
    public bool UseSsl { get; init; }

    /// <summary>Адрес, по которому MinIO доступен из браузера клиента, используется для формирования ImageUrl.</summary>
    public string PublicBaseUrl { get; init; } = "http://localhost:9000";
}
