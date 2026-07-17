using System.Text.Json;
using ECommerce.Application.Common;
using ECommerce.Application.Common.Exceptions;
using ECommerce.Domain.Modles;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Options;

namespace ECommerce.Application.Features.Profile;

public class ChangeCurrency
{
    public record Command(string NewCurrency) : IRequest;

    public class CommandValidator : AbstractValidator<Command>
    {
        public CommandValidator(IOptions<CurrencyOptions> options)
        {
            RuleFor(c => c.NewCurrency)
                .Must(c => options.Value.SupportedCurrencies.Contains(c))
                .WithMessage($"Currency not supported");
        }
    }

    public class Handler(
        IEDbContext eDbContext,
        ICurrentUserService currentUserService,
        IConvertCurrencyService convertCurrencyService) : IRequestHandler<Command>
    {
        public async Task Handle(Command request, CancellationToken cancellationToken)
        {
            var userIdString = currentUserService.UserId;
                
            if (userIdString == null || !Guid.TryParse(userIdString, out var userId))
                throw new Exception("Invalid user id");
            var user = await eDbContext.Customers
                .FirstOrDefaultAsync(c => c.Id == userId, cancellationToken)
                ?? throw new NotFoundException("User not found");

            var oldUserBalance = user.Balance;
            var newUserBalance = await convertCurrencyService
                .ConvertCurrencyAsync(oldUserBalance, request.NewCurrency, cancellationToken);
            
            user.UpdateBalance(newUserBalance);
            await eDbContext.SaveChangesAsync(cancellationToken);
        }
    }
}