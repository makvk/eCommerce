using System.Text;
using System.Text.Json.Serialization;
using ECommerce.Application.Common;
using ECommerce.Domain.Modles;
using ECommerce.Infrastructure.BackgroundServices;
using ECommerce.Infrastructure.Options;
using ECommerce.Infrastructure.Persistence;
using ECommerce.Infrastructure.Services;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using Minio;

namespace ECommerce.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddScoped<IJwtTokenGenerator, Security.JwtTokenGenerator>();
        services.AddScoped<IPasswordHasher, Security.PasswordHasher>();

        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUserService, CurrentUserService>();

        services.AddSingleton<IConvertCurrencyService, ConvertCurrencyService>();

        services.AddHttpClient<GetCurrencyRateApi>();
        services.AddHostedService<CurrencyUpdateWorker>();
        services.Configure<CurrencyOptions>(configuration.GetSection("CurrencySettings"));
        services.Configure<AdminSeedOptions>(configuration.GetSection(AdminSeedOptions.SectionName));
        services.Configure<NotificationsOptions>(configuration.GetSection(NotificationsOptions.SectionName));
        services.Configure<MinioOptions>(configuration.GetSection("MinioSettings"));

        var notifications = configuration.GetSection(NotificationsOptions.SectionName).Get<NotificationsOptions>()
            ?? new NotificationsOptions();
        services.AddHttpClient<IOrderNotificationClient, HttpOrderNotificationClient>(client =>
        {
            if (!string.IsNullOrWhiteSpace(notifications.BaseUrl))
            {
                client.BaseAddress = new Uri(notifications.BaseUrl.TrimEnd('/') + "/");
            }
            client.Timeout = TimeSpan.FromSeconds(5);
        });

        services.AddControllers()
            .AddJsonOptions(options =>
            {
                options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
            });

        var connectionString = configuration.GetConnectionString("DefaultConnection");
        services.AddDbContext<IEDbContext, EDbContext>(options =>
            options.UseNpgsql(connectionString));

        var redisConnectionString = configuration.GetConnectionString("Redis")
            ?? "localhost:6379";
        services.AddStackExchangeRedisCache(options =>
        {
            options.Configuration = redisConnectionString;
            options.InstanceName = configuration["RedisSettings:InstanceName"];
        });

        services.AddSingleton<IMinioClient>(sp =>
        {
            var minioOptions = sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<MinioOptions>>().Value;
            return new MinioClient()
                .WithEndpoint(minioOptions.Endpoint)
                .WithCredentials(minioOptions.AccessKey, minioOptions.SecretKey)
                .WithSSL(minioOptions.UseSsl)
                .Build();
        });
        services.AddScoped<IFileStorageService, MinioFileStorageService>();

        services.AddMediatR(cfg =>
        {
            cfg.RegisterServicesFromAssembly(typeof(IEDbContext).Assembly);
            cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(Security.ValidationBehavior<,>));
        });

        services.AddValidatorsFromAssembly(typeof(IEDbContext).Assembly);

        services.AddEndpointsApiExplorer()
            .AddSwaggerGen(c =>
            {
                c.CustomSchemaIds(type => type.ToString().Replace("+", "."));

                c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme()
                {
                    Description = @"JWT Authorization header using the Bearer scheme.",
                    Name = "Authorization",
                    In = ParameterLocation.Header,
                    Type = SecuritySchemeType.Http,
                    Scheme = "Bearer"
                });

                c.AddSecurityRequirement(doc => new OpenApiSecurityRequirement
                {
                    {
                        new OpenApiSecuritySchemeReference("Bearer"),
                        new List<string>()
                    }
                });
            });

        var jwtSettings = configuration.GetSection("JwtSettings");
        var secretKey = jwtSettings["Secret"];
        if (string.IsNullOrWhiteSpace(secretKey))
        {
            throw new InvalidOperationException(
                "JWT Secret is not configured. Set JwtSettings__Secret env var or user-secrets.");
        }

        services.AddAuthentication("Bearer")
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters()
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = jwtSettings["Issuer"],
                    ValidAudience = jwtSettings["Audience"],
                    IssuerSigningKey = new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(secretKey)
                    )
                };
            });
        services.AddAuthorization();

        return services;
    }
}
