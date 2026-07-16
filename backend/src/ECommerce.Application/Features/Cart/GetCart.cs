using System.Text.Json;
using ECommerce.Application.Common;
using ECommerce.Domain.Entities;
using ECommerce.Domain.Modles;
using ECommerce.Domain.Records;
using MediatR;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Options;

namespace ECommerce.Application.Features.Cart;

public class GetCart
{
    public record ResponseDto(Domain.Entities.Cart Cart, Domain.Records.Money Money);

    public record Query() : IRequest<ResponseDto>;

    public class Handler(
        ICurrentUserService currentUserService,
        IDistributedCache distributedCache,
        IOptions<CurrencyOptions> currencyOptions,
        IConvertCurrencyService convertCurrencyService) : IRequestHandler<Query, ResponseDto>
    {
        private readonly ICurrentUserService _currentUserService = currentUserService;
        private readonly  IDistributedCache _distributedCache = distributedCache;
        private readonly CurrencyOptions _currencyOptions = currencyOptions.Value;
        
        public async Task<ResponseDto> Handle(Query message, CancellationToken cancellationToken)
        {
            var userId = _currentUserService.UserId 
                         ?? throw new UnauthorizedAccessException("User not found");
            var userCurrency = await _currentUserService.GetCurrencyAsync(cancellationToken)
                ?? throw new UnauthorizedAccessException("User not found");
            
            var productsString = await _distributedCache.GetStringAsync(userId, cancellationToken);
            if (string.IsNullOrEmpty(productsString))
            {
                return new ResponseDto(
                    new Domain.Entities.Cart(), 
                    new Money(userCurrency, 0.0m));
            }
            var cart = JsonSerializer.Deserialize<Domain.Entities.Cart>(productsString)
                ?? new Domain.Entities.Cart();
            var amount = 0.0m;
            foreach (var item in cart.Items)
            {
                var convertPrice = await convertCurrencyService.ConvertCurrencyAsync(item.Price, userCurrency, cancellationToken);
                amount += convertPrice.Amount * item.Quantity;
            }

            return new ResponseDto(cart, new Money(userCurrency, amount));
        }
    }
}