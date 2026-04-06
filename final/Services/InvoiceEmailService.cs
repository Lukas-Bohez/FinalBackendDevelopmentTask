using System.Net;
using System.Net.Mail;
using System.Text;

namespace NovaDrive.Services;

public interface IInvoiceEmailService
{
    Task<string> SendInvoiceAsync(string recipientEmail, string invoiceId, string pdfPath, decimal total, string currency);
}

public sealed class InvoiceEmailService : IInvoiceEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<InvoiceEmailService> _logger;

    public InvoiceEmailService(IConfiguration configuration, ILogger<InvoiceEmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<string> SendInvoiceAsync(string recipientEmail, string invoiceId, string pdfPath, decimal total, string currency)
    {
        var subject = $"Nova Drive invoice {invoiceId}";
        var body = $"Your Nova Drive ride invoice {invoiceId} is attached. Total: {currency} {total:F2}.";

        var smtpHost = _configuration["Email:Smtp:Host"];
        if (!string.IsNullOrWhiteSpace(smtpHost))
        {
            await SendViaSmtpAsync(recipientEmail, subject, body, pdfPath);
            return "smtp";
        }

        var outbox = Path.Combine(Directory.GetCurrentDirectory(), "outbox");
        Directory.CreateDirectory(outbox);

        var emlPath = Path.Combine(outbox, $"invoice-{invoiceId}.eml");
        var pdfBytes = await File.ReadAllBytesAsync(pdfPath);
        var boundary = $"----novadrive-{Guid.NewGuid():N}";
        var builder = new StringBuilder();

        builder.AppendLine($"From: {_configuration[\"Email:From\"] ?? \"no-reply@novadrive.local\"}");
        builder.AppendLine($"To: {recipientEmail}");
        builder.AppendLine($"Subject: {subject}");
        builder.AppendLine("MIME-Version: 1.0");
        builder.AppendLine($"Content-Type: multipart/mixed; boundary=\"{boundary}\"");
        builder.AppendLine();
        builder.AppendLine($"--{boundary}");
        builder.AppendLine("Content-Type: text/plain; charset=utf-8");
        builder.AppendLine();
        builder.AppendLine(body);
        builder.AppendLine();
        builder.AppendLine($"--{boundary}");
        builder.AppendLine("Content-Type: application/pdf; name=invoice.pdf");
        builder.AppendLine("Content-Transfer-Encoding: base64");
        builder.AppendLine("Content-Disposition: attachment; filename=invoice.pdf");
        builder.AppendLine();
        builder.AppendLine(Convert.ToBase64String(pdfBytes, Base64FormattingOptions.InsertLineBreaks));
        builder.AppendLine($"--{boundary}--");

        await File.WriteAllTextAsync(emlPath, builder.ToString());
        _logger.LogInformation("SMTP not configured; invoice {InvoiceId} written to {OutboxPath}", invoiceId, emlPath);
        return emlPath;
    }

    private async Task SendViaSmtpAsync(string recipientEmail, string subject, string body, string pdfPath)
    {
        var host = _configuration["Email:Smtp:Host"]!;
        var port = int.TryParse(_configuration["Email:Smtp:Port"], out var parsedPort) ? parsedPort : 587;
        var enableSsl = bool.TryParse(_configuration["Email:Smtp:EnableSsl"], out var parsedSsl) && parsedSsl;
        var username = _configuration["Email:Smtp:Username"];
        var password = _configuration["Email:Smtp:Password"];
        var from = _configuration["Email:From"] ?? username ?? "no-reply@novadrive.local";

        using var message = new MailMessage(from, recipientEmail)
        {
            Subject = subject,
            Body = body
        };

        message.Attachments.Add(new Attachment(pdfPath, "application/pdf"));

        using var client = new SmtpClient(host, port)
        {
            EnableSsl = enableSsl
        };

        if (!string.IsNullOrWhiteSpace(username))
        {
            client.Credentials = new NetworkCredential(username, password);
        }

        await client.SendMailAsync(message);
        _logger.LogInformation("Sent invoice email to {RecipientEmail} via SMTP host {SmtpHost}", recipientEmail, host);
    }
}