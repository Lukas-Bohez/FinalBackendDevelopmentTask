using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace NovaDrive.Services;

public interface IPdfService
{
    string GenerateInvoicePdf(string invoiceId, string passengerEmail, decimal fareExclVat, decimal vat, decimal total, string currency);
}

public class PdfService : IPdfService
{
    public PdfService()
    {
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public string GenerateInvoicePdf(string invoiceId, string passengerEmail,
        decimal fareExclVat, decimal vat, decimal total, string currency)
    {
        var folder = Path.Combine(Directory.GetCurrentDirectory(), "invoices");
        Directory.CreateDirectory(folder);
        var filename = Path.Combine(folder, $"invoice-{invoiceId}.pdf");

        Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(30);

                page.Header().Column(col =>
                {
                    col.Item().Text("NOVA DRIVE").Bold().FontSize(24).FontColor(Colors.Blue.Darken2);
                    col.Item().Text("Autonomous Mobility Platform").FontSize(10).FontColor(Colors.Grey.Darken1);
                    col.Item().PaddingBottom(10).LineHorizontal(1).LineColor(Colors.Grey.Lighten1);
                });

                page.Content().Column(col =>
                {
                    col.Spacing(8);
                    col.Item().Text($"Invoice #{invoiceId}").Bold().FontSize(16);
                    col.Item().Text($"Billed to: {passengerEmail}").FontSize(12);
                    col.Item().Text($"Date: {DateTime.UtcNow:yyyy-MM-dd}").FontSize(11);

                    col.Item().PaddingTop(15).Table(table =>
                    {
                        table.ColumnsDefinition(c =>
                        {
                            c.RelativeColumn(3);
                            c.RelativeColumn(1);
                        });

                        table.Header(h =>
                        {
                            h.Cell().Background(Colors.Grey.Lighten3).Padding(5).Text("Description").Bold();
                            h.Cell().Background(Colors.Grey.Lighten3).Padding(5).AlignRight().Text("Amount").Bold();
                        });

                        table.Cell().Padding(5).Text("Ride fare (excl. VAT)");
                        table.Cell().Padding(5).AlignRight().Text($"{currency} {fareExclVat:F2}");

                        table.Cell().Padding(5).Text("VAT (21%)");
                        table.Cell().Padding(5).AlignRight().Text($"{currency} {vat:F2}");

                        table.Cell().Background(Colors.Blue.Lighten5).Padding(5).Text("Total").Bold();
                        table.Cell().Background(Colors.Blue.Lighten5).Padding(5).AlignRight().Text($"{currency} {total:F2}").Bold();
                    });
                });

                page.Footer().AlignCenter().Text(t =>
                {
                    t.Span("Generated ").FontSize(8);
                    t.Span($"{DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC").FontSize(8).Italic();
                });
            });
        }).GeneratePdf(filename);

        return filename;
    }
}