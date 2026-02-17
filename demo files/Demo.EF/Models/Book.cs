
namespace Demo.EF.Models;

public class Book
{
    public int Id { get; set; }
    public string Title { get; set; } = "";
    public string? Publisher { get; set; }
    public string? Isbn { get; set; }
    public int AuthorId { get; set; }
    public Author Author { get; set; } = null!;
}

public class BookProfile : Profile
{
    public BookProfile()
    {
        CreateMap<Book, BookDto>();
    }
}