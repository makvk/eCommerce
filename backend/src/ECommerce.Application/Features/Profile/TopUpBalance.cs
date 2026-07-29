using ECommerce.Application.Common;
using ECommerce.Application.Common.Exceptions;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ECommerce.Application.Features.Profile;

public class TopUpBalance
{
    public record Command(decimal Amount) : IRequest;

    public class CommandValidator : AbstractValidator<Command>
    {
        public CommandValidator()
        {
            RuleFor(c => c.Amount)
                .GreaterThan(0)
                .WithMessage("Amount must be greater than zero");
        }
    }

    public class Handler(
        IEDbContext eDbContext,
        ICurrentUserService currentUserService) : IRequestHandler<Command>
    {
        public async Task Handle(Command request, CancellationToken cancellationToken)
        {
            var userIdString = currentUserService.UserId;

            if (userIdString == null || !Guid.TryParse(userIdString, out var userId))
                throw new UnauthorizedException("Invalid user id");

            var user = await eDbContext.Customers
                .FirstOrDefaultAsync(c => c.Id == userId, cancellationToken)
                ?? throw new NotFoundException("User not found");

            user.UpToBalance(request.Amount);
            await eDbContext.SaveChangesAsync(cancellationToken);
        }
    }
}
