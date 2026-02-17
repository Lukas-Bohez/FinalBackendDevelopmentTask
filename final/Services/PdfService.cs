using System;
using System.IO;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace NovaDrive.Services
{
    public interface IPdfService
    {
        string GenerateInvoicePdf(string invoiceId, string passengerEmail, string contentHtml);
    }

    public class PdfService : IPdfService
    {
        public PdfService() { }

        public string GenerateInvoicePdf(string invoiceId, string passengerEmail, string contentHtml)
        {
            var folder = Path.Combine(Directory.GetCurrentDirectory(), "invoices");
            Directory.CreateDirectory(folder);
            var filename = Path.Combine(folder, $"invoice-{invoiceId}.pdf");

            Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(20);
                    page.Content().Column(col =>
                    {
                        col.Item().Text($"Nova Drive - Invoice {invoiceId}").Bold().FontSize(20);
                        col.Item().Text($"To: {passengerEmail}").FontSize(12);
                        col.Item().Text(contentHtml).FontSize(11);
                        col.Item().Text($"Generated: {DateTime.UtcNow:yyyy-MM-dd HH:mm}").FontSize(9).Italic();
                    });
                });
            }).GeneratePdf(filename);

            return filename;
        }
    }
}