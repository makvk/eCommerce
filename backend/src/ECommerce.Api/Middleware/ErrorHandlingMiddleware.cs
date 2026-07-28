using System.Text.Json;
using ECommerce.Application.Common.Exceptions;
using FluentValidation;
using Microsoft.AspNetCore.Mvc;

namespace ECommerce.Api.Middleware;

public class ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
{
    private readonly RequestDelegate _next = next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger = logger;

    private static readonly JsonSerializerOptions JsonOptions = new JsonSerializerOptions
    {
        Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (ValidationException validationException)
        {
            await HandleValidationExceptionAsync(context, validationException);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleValidationExceptionAsync(HttpContext context, ValidationException exception)
    {
        const int statusCode = StatusCodes.Status400BadRequest;

        var errors = exception.Errors
            .GroupBy(e => e.PropertyName)
            .ToDictionary(
                g => g.Key,
                g => g.Select(e => e.ErrorMessage).ToArray()
            );

        _logger.LogWarning(
            "Validation failed while processing {Path}: {Errors}",
            context.Request.Path,
            string.Join("; ", exception.Errors.Select(e => e.ErrorMessage)));

        var problemDetails = new ProblemDetails
        {
            Type = GetRfcTypeUri(statusCode),
            Title = "One or more validation errors occurred.",
            Status = statusCode,
            Instance = context.Request.Path
        };

        problemDetails.Extensions.Add("errors", errors);

        await WriteProblemDetailsAsync(context, statusCode, problemDetails);
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var (statusCode, title) = MapException(exception);

        if (statusCode == StatusCodes.Status500InternalServerError)
        {
            _logger.LogError(exception, "Unhandled exception occurred while processing {Path}", context.Request.Path);
        }
        else
        {
            _logger.LogWarning(
                "{Title} ({StatusCode}) while processing {Path}: {Message}",
                title, statusCode, context.Request.Path, exception.Message);
        }

        var problemDetails = new ProblemDetails
        {
            Type = GetRfcTypeUri(statusCode),
            Title = title,
            Status = statusCode,
            Instance = context.Request.Path,
            Detail = statusCode == StatusCodes.Status500InternalServerError
                ? "An unexpected error occurred while processing your request."
                : exception.Message
        };

#if DEBUG
        if (statusCode == StatusCodes.Status500InternalServerError)
        {
            problemDetails.Extensions.Add("exceptionDetails", exception.Message);
        }
#endif

        await WriteProblemDetailsAsync(context, statusCode, problemDetails);
    }

    private static (int StatusCode, string Title) MapException(Exception exception) => exception switch
    {
        BadRequestException => (StatusCodes.Status400BadRequest, "Bad Request"),
        UnauthorizedException => (StatusCodes.Status401Unauthorized, "Unauthorized"),
        UnauthorizedAccessException => (StatusCodes.Status401Unauthorized, "Unauthorized"),
        ForbiddenException => (StatusCodes.Status403Forbidden, "Forbidden"),
        NotFoundException => (StatusCodes.Status404NotFound, "Not Found"),
        ConflictException => (StatusCodes.Status409Conflict, "Conflict"),
        ServiceUnavailableException => (StatusCodes.Status503ServiceUnavailable, "Service Unavailable"),
        _ => (StatusCodes.Status500InternalServerError, "Internal Server Error")
    };

    private static string GetRfcTypeUri(int statusCode) => statusCode switch
    {
        StatusCodes.Status400BadRequest => "https://tools.ietf.org/html/rfc9110#section-15.5.1",
        StatusCodes.Status401Unauthorized => "https://tools.ietf.org/html/rfc9110#section-15.5.2",
        StatusCodes.Status403Forbidden => "https://tools.ietf.org/html/rfc9110#section-15.5.4",
        StatusCodes.Status404NotFound => "https://tools.ietf.org/html/rfc9110#section-15.5.5",
        StatusCodes.Status409Conflict => "https://tools.ietf.org/html/rfc9110#section-15.5.10",
        StatusCodes.Status503ServiceUnavailable => "https://tools.ietf.org/html/rfc9110#section-15.6.4",
        _ => "https://tools.ietf.org/html/rfc9110#section-15.6.1"
    };

    private static async Task WriteProblemDetailsAsync(HttpContext context, int statusCode, ProblemDetails problemDetails)
    {
        context.Response.ContentType = "application/problem+json";
        context.Response.StatusCode = statusCode;

        var json = JsonSerializer.Serialize(problemDetails, JsonOptions);
        await context.Response.WriteAsync(json);
    }
}
