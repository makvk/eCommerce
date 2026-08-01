using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Testcontainers.PostgreSql;
using Testcontainers.Redis;

namespace ECommerce.Tests.Integration;

public class EcommerceApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder("postgres:16-alpine").Build();
    private readonly RedisContainer _redis = new RedisBuilder("redis:7-alpine").Build();

    private Dictionary<string, string?> TestSettings => new()
    {
        ["ConnectionStrings:DefaultConnection"] = _postgres.GetConnectionString(),
        ["ConnectionStrings:Redis"] = _redis.GetConnectionString(),
        ["JwtSettings:Secret"] = "TEST_SECRET_KEY_FOR_INTEGRATION_TESTS_32CHARS",
        ["JwtSettings:Issuer"] = "ECommerce.Api",
        ["JwtSettings:Audience"] = "ECommerce.App",
        ["CurrencySettings:BaseCurrency"] = "RUB",
        ["CurrencySettings:SupportedCurrencies:0"] = "RUB",
        ["CurrencySettings:SupportedCurrencies:1"] = "USD",
        ["CurrencySettings:SupportedCurrencies:2"] = "EUR",
        ["CurrencySettings:SupportedCurrencies:3"] = "KZT",
        ["AdminSeed:Email"] = "admin@ecommerce.local",
        ["AdminSeed:Password"] = "Admin123!",
        ["Notifications:Enabled"] = "false",
        ["MinioSettings:Endpoint"] = "localhost:9000",
        ["MinioSettings:AccessKey"] = "minioadmin",
        ["MinioSettings:SecretKey"] = "minioadmin",
        ["MinioSettings:BucketName"] = "product-images",
        ["MinioSettings:UseSsl"] = "false",
        ["MinioSettings:PublicBaseUrl"] = "http://localhost:9000",
        ["Cors:AllowedOrigins:0"] = "http://localhost:5173"
    };

    public async Task InitializeAsync()
    {
        await Task.WhenAll(_postgres.StartAsync(), _redis.StartAsync());
    }

    public new async Task DisposeAsync()
    {
        await _postgres.DisposeAsync();
        await _redis.DisposeAsync();
        await base.DisposeAsync();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
    }

    protected override IHost CreateHost(IHostBuilder builder)
    {
        // Host configuration is available when Program calls AddInfrastructure.
        builder.ConfigureHostConfiguration(config =>
        {
            config.AddInMemoryCollection(TestSettings);
        });

        builder.ConfigureAppConfiguration(config =>
        {
            config.AddInMemoryCollection(TestSettings);
        });

        return base.CreateHost(builder);
    }
}
