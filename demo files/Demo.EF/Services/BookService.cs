
namespace Demo.EF.Services;

public interface IBookService
{
    Task<List<Book>> GetBooksAsync();
    Task<Book> GetBookAsync(int id);
    Task<Book> AddBookAsync(Book book);
    Task<Book> UpdateBookAsync(Book book);
    Task DeleteBookAsync(int id);
}

public class BookService : IBookService
{
    private readonly IBookRepository _bookRepository;
    private readonly IAuthorRepository _authorRepository;

    public BookService(IBookRepository bookRepository, IAuthorRepository authorRepository)
    {
        _bookRepository = bookRepository;
        _authorRepository = authorRepository;
    }

    public async Task<List<Book>> GetBooksAsync() => await _bookRepository.GetBooksAsync();


    public async Task<Book> GetBookAsync(int id)
    {
        return await _bookRepository.GetBookAsync(id);
    }

    public async Task<Book> AddBookAsync(Book book)
    {
        var author = await _authorRepository.GetAuthorAsync(book.AuthorId);
        if (author == null)
        {
            throw new Exception("Author not found");
        }
        var createdBook = await _bookRepository.AddBookAsync(book);
        return await GetBookAsync(createdBook.Id);
    }

    public async Task<Book> UpdateBookAsync(Book book)
    {
        var author = await _authorRepository.GetAuthorAsync(book.AuthorId);
        if (author == null)
        {
            throw new Exception("Author not found");
        }
        var createdBook = await _bookRepository.UpdateBookAsync(book);
        return await GetBookAsync(createdBook.Id);
    }

    public async Task DeleteBookAsync(int id)
    {
        await _bookRepository.DeleteBookAsync(id);
    }


}