namespace ECommerce.Infrastructure.Options;

public class AdminSeedOptions
{
    public const string SectionName = "AdminSeed";

    public string Email { get; set; } = "admin@ecommerce.local";
    public string Password { get; set; } = "Admin123!";
    public string FirstName { get; set; } = "Store";
    public string LastName { get; set; } = "Admin";
}
