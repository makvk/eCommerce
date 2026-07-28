using ECommerce.Application.Common;
using ECommerce.Application.Common.Exceptions;
using FluentValidation;
using MediatR;

namespace ECommerce.Application.Features.Products;

public class UploadProductImage
{
    private static readonly Dictionary<string, string> AllowedContentTypes = new()
    {
        ["image/jpeg"] = ".jpg",
        ["image/png"] = ".png",
        ["image/webp"] = ".webp",
    };

    public record ResponseDto(string ImageUrl);

    public record Command(Guid ProductId, Stream Content, long ContentLength, string ContentType) : IRequest<ResponseDto>;

    public class CommandValidator : AbstractValidator<Command>
    {
        public const long MaxSizeBytes = 5 * 1024 * 1024;

        public CommandValidator()
        {
            RuleFor(x => x.ContentType)
                .Must(AllowedContentTypes.ContainsKey)
                .WithMessage("Unsupported image type. Allowed: jpeg, png, webp");

            RuleFor(x => x.ContentLength)
                .GreaterThan(0)
                .LessThanOrEqualTo(MaxSizeBytes)
                .WithMessage($"Image must be between 1 byte and {MaxSizeBytes / 1024 / 1024} MB");
        }
    }

    public class Handler(
        IEDbContext eDbContext,
        IFileStorageService fileStorageService) : IRequestHandler<Command, ResponseDto>
    {
        public async Task<ResponseDto> Handle(Command request, CancellationToken cancellationToken)
        {
            var product = await eDbContext.GetProductByIdAsync(request.ProductId, cancellationToken)
                ?? throw new NotFoundException("Product not found");

            var previousImageUrl = product.ImageUrl;
            var extension = AllowedContentTypes[request.ContentType];
            // Один товар — один файл: имя объекта фиксировано его id, повторная загрузка перезаписывает старый.
            var objectName = $"products/{product.Id}{extension}";

            var imageUrl = await fileStorageService.UploadAsync(
                request.Content,
                objectName,
                request.ContentType,
                cancellationToken);

            product.SetImageUrl(imageUrl);
            await eDbContext.SaveChangesAsync(cancellationToken);

            // Старый файл подчищаем уже после того, как новый успешно сохранён и закоммичен в БД.
            if (!string.IsNullOrEmpty(previousImageUrl) && previousImageUrl != imageUrl)
                await fileStorageService.DeleteAsync(previousImageUrl, cancellationToken);

            return new ResponseDto(imageUrl);
        }
    }
}
