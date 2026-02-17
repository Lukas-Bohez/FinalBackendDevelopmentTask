

namespace Demo.EF.Repositories;

public interface IAuthorRepository
{
    Task<List<Author>> GetAuthorsAsync();
    Task<Author> GetAuthorAsync(int id);
    Task<Author> AddAuthorAsync(Author author);
    Task<Author> UpdateAuthorAsync(Author author);
    Task DeleteAuthorAsync(int id);
}


public class AuthorRepository : IAuthorRepository
{

    private readonly EFDemoContext _context;

    public AuthorRepository(EFDemoContext context)
    {
        _context = context;
    }

    public async Task<List<Author>> GetAuthorsAsync()
    {
        return await _context.Authors.ToListAsync();
    }

    public async Task<Author> GetAuthorAsync(int id)
    {
        return await _context.Authors.FindAsync(id);
    }

    public async Task<Author> AddAuthorAsync(Author author)
    {
        _context.Authors.Add(author);
        await _context.SaveChangesAsync();
        return author;
    }

    public async Task<Author> UpdateAuthorAsync(Author author)
    {
        _context.Entry(author).State = EntityState.Modified;
        await _context.SaveChangesAsync();
        return author;
    }

    public async Task DeleteAuthorAsync(int id)
    {
        var author = await _context.Authors.FindAsync(id);
        _context.Authors.Remove(author);
        await _context.SaveChangesAsync();
    }
}