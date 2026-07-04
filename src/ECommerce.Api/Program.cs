using System.Text;
using ECommerce.Application.Common;
using ECommerce.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using FluentValidation;
using MediatR;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

var services = builder.Services;

services.AddScoped<ECommerce.Application.Common.IJwtTokenGenerator, ECommerce.Infrastructure.Security.JwtTokenGenerator>();

services.AddControllers();
// Регистрация контекста работы с бд в DI
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

services.AddDbContext<EDbContext>(options => 
    options.UseNpgsql(connectionString));

// Регистрация MediatR
services.AddMediatR(cfg =>
{
    cfg.RegisterServicesFromAssembly(typeof(IEDbContext).Assembly);
    cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(ECommerce.Application.Common.ValidationBehavior<,>));
});

services.AddValidatorsFromAssembly(typeof(IEDbContext).Assembly);
// Настройка Swagger
services.AddEndpointsApiExplorer()
    .AddSwaggerGen(c =>
    {
        c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
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
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
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

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapScalarApiReference();
    app.MapSwagger("/openapi/{documentName}.json");
    app.MapGet("/health", () => Results.Json(new { status = "ok", message = "ok" }));
}

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

