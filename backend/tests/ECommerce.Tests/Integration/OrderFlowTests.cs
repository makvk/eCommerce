using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using ECommerce.Domain.Records;

namespace ECommerce.Tests.Integration;

public class OrderFlowTests : IClassFixture<EcommerceApiFactory>
{
    private readonly HttpClient _client;
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public OrderFlowTests(EcommerceApiFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Health_ReturnsOk()
    {
        var response = await _client.GetAsync("/health");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Register_TopUp_AddToCart_CreateOrder_Cancel_Works()
    {
        var email = $"user_{Guid.NewGuid():N}@test.local";
        var password = "Password123!";

        var registerResponse = await _client.PostAsJsonAsync("/api/auth/register", new
        {
            user = new
            {
                email,
                password,
                fullName = new { firstName = "Test", lastName = "User", middleName = "" }
            }
        });
        Assert.Equal(HttpStatusCode.OK, registerResponse.StatusCode);
        var registerBody = await registerResponse.Content.ReadFromJsonAsync<AuthResult>(JsonOptions);
        Assert.False(string.IsNullOrWhiteSpace(registerBody?.Token));
        SetBearer(registerBody!.Token);

        var topUp = await _client.PostAsJsonAsync("/api/profile/balance", new { amount = 10_000m });
        Assert.Equal(HttpStatusCode.NoContent, topUp.StatusCode);

        // Admin creates a product
        var adminLogin = await _client.PostAsJsonAsync("/api/auth/login", new
        {
            user = new { email = "admin@ecommerce.local", password = "Admin123!" }
        });
        Assert.Equal(HttpStatusCode.OK, adminLogin.StatusCode);
        var adminAuth = await adminLogin.Content.ReadFromJsonAsync<AuthResult>(JsonOptions);
        SetBearer(adminAuth!.Token);

        var addProduct = await _client.PostAsJsonAsync("/api/admin/products", new
        {
            name = "Test Phone",
            description = "Integration test product",
            price = new { currency = "RUB", amount = 1000m },
            stockQuantity = 5
        });
        Assert.Equal(HttpStatusCode.Created, addProduct.StatusCode);
        var productId = await addProduct.Content.ReadFromJsonAsync<Guid>(JsonOptions);
        Assert.NotEqual(Guid.Empty, productId);

        // Back to customer
        var customerLogin = await _client.PostAsJsonAsync("/api/auth/login", new
        {
            user = new { email, password }
        });
        var customerAuth = await customerLogin.Content.ReadFromJsonAsync<AuthResult>(JsonOptions);
        SetBearer(customerAuth!.Token);

        var addToCart = await _client.PostAsJsonAsync("/api/cart/items", new
        {
            productId,
            quantity = 1
        });
        Assert.Equal(HttpStatusCode.NoContent, addToCart.StatusCode);

        var createOrder = await _client.PostAsJsonAsync("/api/orders", new
        {
            address = new Address("RU", "Tverskaya 1", "Moscow", "125009")
        });
        Assert.Equal(HttpStatusCode.Created, createOrder.StatusCode);
        var orderBody = await createOrder.Content.ReadFromJsonAsync<CreateOrderResult>(JsonOptions);
        Assert.NotEqual(Guid.Empty, orderBody!.OrderId);

        var cancel = await _client.PatchAsync($"/api/orders/{orderBody.OrderId}/cancel", null);
        Assert.Equal(HttpStatusCode.NoContent, cancel.StatusCode);
    }

    private void SetBearer(string token)
    {
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }

    private sealed record AuthResult(string Token);
    private sealed record CreateOrderResult(Guid OrderId);
}
