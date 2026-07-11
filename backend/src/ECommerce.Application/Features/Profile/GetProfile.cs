using ECommerce.Application.Common;
using ECommerce.Application.Common.Exceptions;
using ECommerce.Domain.Entities;
using ECommerce.Domain.Records;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ECommerce.Application.Features.Profile;

public class GetProfile
{
    public record ResponseDto(string Email, Money Balance, FullName Name);
    public record Query : IRequest<ResponseDto>;

    public class Handler(IEDbContext eDbContext, ICurrentUserService currentUserService) : IRequestHandler<Query, ResponseDto>
    {
        private readonly IEDbContext _eDbContext = eDbContext;
        private readonly ICurrentUserService _currentUserService = currentUserService;
        public async Task<ResponseDto> Handle(
            Query request,
            CancellationToken cancellationToken)
        {
            var customerStrId = _currentUserService.UserId;
            if (customerStrId == null || !Guid.TryParse(customerStrId, out var customerId))
            {
                throw new UnauthorizedAccessException("Invalid user id");
            }

            var customer = await _eDbContext.Customers
                .FirstOrDefaultAsync(c => c.Id == customerId, cancellationToken);

            if (customer == null) throw new NotFoundException("Customer not found");
            
            var response = new ResponseDto(
                customer.Email,
                customer.Balance,
                customer.Name);
            
            return response;
        }
    }
}