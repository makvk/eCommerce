using ECommerce.Application.Common;
using ECommerce.Application.Common.Exceptions;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ECommerce.Application.Features.Auth;

public class Login
{
    public class UserData
    {
        public string? Email { get; init; }
        public string? Password { get; init; }
    }

    public record AuthResult(string Token);
    // Команда
    public record Command(UserData User) : IRequest<AuthResult>;
    
    // Валидатор
    public class CommandValidator : AbstractValidator<Command>
    {
        public CommandValidator()
        {
            RuleFor(x => x.User.Email)
                .NotNull().NotEmpty()
                .WithMessage("Email is required");
            
            RuleFor(x => x.User.Password)
                .NotNull().NotEmpty()
                .WithMessage("Password is required");;
        }
    };
    // Хендлер
    public class Handler(IJwtTokenGenerator jwtTokenGenerator, 
        IEDbContext eDbContext, 
        IPasswordHasher passwordHasher) : IRequestHandler<Command, AuthResult>
    {
        private readonly IEDbContext _eDbContext = eDbContext;
        private readonly IJwtTokenGenerator _jwtTokenGenerator = jwtTokenGenerator;
        private readonly IPasswordHasher _passwordHasher = passwordHasher;
        public async Task<AuthResult> Handle(Command request, CancellationToken cancellationToken)
        {
            var email = request.User.Email!.Trim().ToLowerInvariant();
            var user = await _eDbContext.Customers
                .AsNoTracking()
                .FirstOrDefaultAsync(
                u => u.Email == email,
                cancellationToken
            );

            if (user == null || !_passwordHasher.VerifyHashedPassword(request.User.Password!, user.PasswordHash))
            {
                throw new UnauthorizedException("Invalid email or password");
            }

            var token = _jwtTokenGenerator.GenerateToken(
                user.Id,
                user.Role,
                user.Email
            );
            return new AuthResult(token);
        }
    }
}