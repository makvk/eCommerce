using FluentValidation;
using MediatR;

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
    public record Command(UserData User) : IRequest<UserData>;
    
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
    public class Handle() : IRequestHandler<Command, UserData>
}