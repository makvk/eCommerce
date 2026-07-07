using ECommerce.Application.Common;
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
                .NotNull().NotEmpty();
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
        private readonly IPasswordHasher _passwordHasher =  passwordHasher;
        private readonly IJwtTokenGenerator _jwtTokenGenerator =  jwtTokenGenerator;
        private readonly  IEDbContext _eDbContext = eDbContext;
        public async Task<AuthResult> Handle(Command request, CancellationToken cancellationToken)
        {
            var user = await _eDbContext.Customers.FirstOrDefaultAsync(
                c => c.Email == request.User.Email,
                cancellationToken
            );
            if (user != null)
            {
                throw new Exception("Email already exists");
            }
            var hashedPassword = _passwordHasher.HashPassword(request.User.Password!);
            var newUser = new Customer(
                request.User.Email!,
                hashedPassword,
                request.User.FullName!
            );
            await _eDbContext.AddCustomerAsync(newUser, cancellationToken);
            await _eDbContext.SaveChangesAsync(cancellationToken);

            var token = _jwtTokenGenerator.GenerateToken(
                newUser.Id,
                "Customer",
                newUser.Email
            );
            return new AuthResult(token);
        }
    }
}