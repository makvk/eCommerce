

using System.Text.Json;
using ECommerce.Application.Common.Exceptions;

namespace ECommerce.Api.Middleware;

public class ErrorHandlingMiddleware(
    RequestDelegate next)
{
    private readonly RequestDelegate _next = next;

    public async Task InvokeAsync(HttpContext httpContext)
    {
        try
        {
            await _next(httpContext);
            if (httpContext.Response.StatusCode == 401)
            {
                
            }
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(ex, httpContext);
        }
    }
    private async Task HandleExceptionAsync(Exception ex, HttpContext httpContext)
    {
        httpContext.Response.ContentType = "application/json";
        httpContext.Response.StatusCode = ex switch
        {
            // Ошибки валидации
            FluentValidation.ValidationException => StatusCodes.Status400BadRequest,

            // Кастомные ошибки
            NotFoundException => StatusCodes.Status404NotFound,
            ConflictException => StatusCodes.Status409Conflict,
            BadRequestException => StatusCodes.Status400BadRequest,

            _ => StatusCodes.Status500InternalServerError
        };
        var response = new
        {
            error = ex.Message,
            statusCode = httpContext.Response.StatusCode
        };
        await httpContext.Response.WriteAsync(JsonSerializer.Serialize(response));
    }
}