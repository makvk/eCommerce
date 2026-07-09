using System.Data.SqlTypes;
using ECommerce.Application.Common;
using ECommerce.Domain.Entities;
using ECommerce.Domain.Records;
using FluentValidation;
using MediatR;

namespace ECommerce.Application.Features.Products;

public class AddProduct
{
    public record Command(string Name, string Description, Money Price, int StockQuantity) : IRequest<Guid>;
    
    public class CommandValidator : AbstractValidator<Command>
    {
        private readonly List<string> _currencies = ["RUB", "EUR", "USD"];
        public CommandValidator()
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
                .NotNull()
                .Must(x => _currencies.Contains(x))
                .WithMessage(x => $"Currency {x} does not exist");
            RuleFor(x => x.Price.Amount)
                .NotNull()
                .GreaterThan(0);
            RuleFor(x => x.StockQuantity)
                .NotNull()
                .GreaterThanOrEqualTo(0);
        }

        public class Handler(IEDbContext eDbContext) : IRequestHandler<Command, Guid>
        {
            private readonly IEDbContext _eDbContext = eDbContext;

            public async Task<Guid> Handle(Command request, CancellationToken cancellationToken)
            {
                var newProduct = new Product(
                    request.Name,
                    request.Description,
                    request.Price,
                    request.StockQuantity);
                await _eDbContext.AddProductAsync(newProduct, cancellationToken);
                
                return newProduct.Id;
            }
        }
    }
}