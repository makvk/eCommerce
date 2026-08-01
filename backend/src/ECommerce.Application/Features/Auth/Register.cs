using ECommerce.Application.Common;
using ECommerce.Application.Common.Exceptions;
using ECommerce.Domain.Constants;
using ECommerce.Domain.Entities;
using ECommerce.Domain.Records;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ECommerce.Application.Features.Auth;

public class Register
{
    public class UserData
    {
        public string? Email { get; init; }
        public string? Password { get; init; }
        public FullName? FullName { get; init; }
    }
    public record AuthResult(string Token);
    public record Command(UserData User) : IRequest<AuthResult>;

    public class CommandValidator : AbstractValidator<Command>
    {
        public CommandValidator()
        {
            RuleFor(x => x.User.Email)
                .NotNull().NotEmpty().EmailAddress();
            RuleFor(x => x.User.Password)
                .NotNull().NotEmpty().MinimumLength(8);
            RuleFor(x => x.User.FullName)
                .NotNull();
        }
    }

    public class Handler(
        IPasswordHasher passwordHasher,
        IJwtTokenGenerator jwtTokenGenerator,
        IEDbContext eDbContext) : IRequestHandler<Command, AuthResult>
    {
        public async Task<AuthResult> Handle(Command request, CancellationToken cancellationToken)
        {
            var email = request.User.Email!.Trim().ToLowerInvariant();
            var user = await eDbContext.Customers.FirstOrDefaultAsync(
                c => c.Email == email,
                cancellationToken
            );
            if (user != null)
            {
                throw new ConflictException("Email already exists");
            }

            var hashedPassword = passwordHasher.HashPassword(request.User.Password!);
            var newUser = new Customer(
                email,
                hashedPassword,
                request.User.FullName!,
                AppRoles.Customer
            );
            await eDbContext.AddCustomerAsync(newUser, cancellationToken);
            await eDbContext.SaveChangesAsync(cancellationToken);

            var token = jwtTokenGenerator.GenerateToken(
                newUser.Id,
                newUser.Role,
                newUser.Email
            );
            return new AuthResult(token);
        }
    }
}