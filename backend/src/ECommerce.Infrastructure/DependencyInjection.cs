using System.Text;
using ECommerce.Application.Common;
using ECommerce.Infrastructure.BackgroundServices;
using ECommerce.Infrastructure.Persistence;
using ECommerce.Infrastructure.Services;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;


namespace ECommerce.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {   
        // Кастомные сервисы
        services.AddScoped<IJwtTokenGenerator, Security.JwtTokenGenerator>();
        services.AddScoped<IPasswordHasher, Security.PasswordHasher>();

        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUserService, CurrentUserService>();

        services.AddHttpClient<GetCurrencyRateApi>();
        services.AddHostedService<CurrencyUpdateWorker>();
        
        services.AddControllers();
        // Регистрация контекста работы с бд в DI
        var connectionString = configuration.GetConnectionString("DefaultConnection");

        services.AddDbContext<IEDbContext, EDbContext>(options => 
            options.UseNpgsql(connectionString));
        
        //Redis
#if DEBUG
        var redisConnectionString = "localhost:6379";
#else
        var redisConnectionString = configuration.GetConnectionString("Redis");
#endif
        services.AddStackExchangeRedisCache(options =>
        {
            options.Configuration = redisConnectionString;
            options.InstanceName = configuration["RedisSettings:InstanceName"];
        });
        
        // Регистрация MediatR
        services.AddMediatR(cfg =>
        {
            cfg.RegisterServicesFromAssembly(typeof(IEDbContext).Assembly);
            cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(Security.ValidationBehavior<,>));
        });
        
        services.AddValidatorsFromAssembly(typeof(IEDbContext).Assembly);
        
        // Настройка Swagger
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
        
        // Настройка авторизации
        var jwtSettings = configuration.GetSection("JwtSettings");
        var secretKey = jwtSettings["Secret"] ?? throw new InvalidOperationException("JWT Secret не найден!");

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