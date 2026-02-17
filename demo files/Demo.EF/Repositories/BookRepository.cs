namespace Demo.EF.Repositories;

public interface IBookRepository
{
    Task<List<Book>> GetBooksAsync();
    Task<Book> GetBookAsync(int id);
    Task<Book> AddBookAsync(Book book);
    Task<Book> UpdateBookAsync(Book book);
    Task DeleteBookAsync(int id);
}


public class BookRepository : IBookRepository{

    private readonly EFDemoContext _context;

    public BookRepository(EFDemoContext context)
    {
        _context = context;
    }

    public async Task<List<Book>> GetBooksAsync()
    {
        return await _context.Books.Include(a => a.Author).ToListAsync();
    }

    public async Task<Book> GetBookAsync(int id)
    {
        return await _context.Books.FindAsync(id);
    }

    public async Task<Book> AddBookAsync(Book book)
    {
        _context.Books.Add(book);
        await _context.SaveChangesAsync();
        return book;
    }

    public async Task<Book> UpdateBookAsync(Book book)
    {
        _context.Entry(book).State = EntityState.Modified;
        await _context.SaveChangesAsync();
        return book;
    }

    public async Task DeleteBookAsync(int id)
    {
        var book = await _context.Books.FindAsync(id);
        _context.Books.Remove(book);
        await _context.SaveChangesAsync();
    }
}