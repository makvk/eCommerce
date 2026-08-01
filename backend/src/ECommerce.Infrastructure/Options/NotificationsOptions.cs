namespace ECommerce.Infrastructure.Options;

public class NotificationsOptions
{
    public const string SectionName = "Notifications";

    /// <summary>Base URL of the FastAPI notifications service, e.g. http://localhost:8100</summary>
    public string BaseUrl { get; set; } = "";

    /// <summary>When false or BaseUrl empty, notifications are skipped (logged only).</summary>
    public bool Enabled { get; set; } = false;
}
