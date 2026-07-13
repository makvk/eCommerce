using ECommerce.Application.Common;
using ECommerce.Application.Common.Exceptions;
using ECommerce.Domain.Records;
using FluentValidation;
using MediatR;

namespace ECommerce.Application.Features.Products;

public class UpdateProduct
{
    public record CommandDto(
        string Name,
        string Description,
        Money Price,
        int StockQuantity);

    public record Command(Guid Id, CommandDto Data) : IRequest;

    public class CommandValidator : AbstractValidator<Command>
    {
        private readonly List<string> _currencies = ["RUB"];

        public CommandValidator()
        {
            RuleFor(x => x.Data.Name)
                .NotEmpty()
                .NotNull();
            RuleFor(x => x.Data.Description)
                .NotEmpty()
                .NotNull();
            RuleFor(x => x.Data.Price)
                .NotNull();
            RuleFor(x => x.Data.Price.Currency)
                .NotNull()
                .Must(x => _currencies.Contains(x))
                .WithMessage(x => $"Currency {x} does not exist");
            RuleFor(x => x.Data.Price.Amount)
                .NotNull()
                .GreaterThan(0);
            RuleFor(x => x.Data.StockQuantity)
                .NotNull()
                .GreaterThanOrEqualTo(0);
        }
    }

    public class Handler(IEDbContext eDbContext) : IRequestHandler<Command>
    {
        private readonly IEDbContext _eDbContext = eDbContext;

        public async Task Handle(Command request, CancellationToken cancellationToken)
        {
            var product = await _eDbContext.GetProductByIdAsync(request.Id, cancellationToken);

            if (product == null)
            {
                throw new NotFoundException("Product not found");
            }

            product.UpdateDetails(
                request.Data.Name,
                request.Data.Description,
                request.Data.Price,
                request.Data.StockQuantity);
            await _eDbContext.SaveChangesAsync(cancellationToken);
        }
    }
}