using ECommerce.Application.Common;
using ECommerce.Domain.Entities;
using ECommerce.Domain.Modles;
using ECommerce.Domain.Records;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.Options;

namespace ECommerce.Application.Features.Products.Admin;

public class AddProduct
{
    public record Command(string Name, string Description, Money Price, int StockQuantity) : IRequest<Guid>;

    public class CommandValidator : AbstractValidator<Command>
    {
        public CommandValidator(IOptions<CurrencyOptions> options)
        {
            RuleFor(x => x.Name)
                .NotEmpty()
                .NotNull();
            RuleFor(x => x.Description)
                .NotEmpty()
                .NotNull();
            RuleFor(x => x.Price)
                .NotNull();
            RuleFor(x => x.Price.Currency)
                .NotEmpty()
                .Must(c => c == options.Value.BaseCurrency)
                .WithMessage(c => $"Product price must be in base currency '{options.Value.BaseCurrency}'");
            RuleFor(x => x.Price.Amount)
                .NotNull()
                .GreaterThan(0);
            RuleFor(x => x.StockQuantity)
                .NotNull()
                .GreaterThanOrEqualTo(0);
        }
    }

    public class Handler(IEDbContext eDbContext) : IRequestHandler<Command, Guid>
    {
        public async Task<Guid> Handle(Command request, CancellationToken cancellationToken)
        {
            var newProduct = new Product(
                request.Name,
                request.Description,
                request.Price,
                request.StockQuantity);
            await eDbContext.AddProductAsync(newProduct, cancellationToken);
            await eDbContext.SaveChangesAsync(cancellationToken);
            return newProduct.Id;
        }
    }
}
