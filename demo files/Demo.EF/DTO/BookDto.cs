namespace Demo.EF.Dto;

public class BookDto
{
    public int Id { get; set; }
    public string Title { get; set; } = "";
    public string? Publisher { get; set; }
    public string? Isbn { get; set; }
    public string AuthorName { get; set; } = "";
}
 