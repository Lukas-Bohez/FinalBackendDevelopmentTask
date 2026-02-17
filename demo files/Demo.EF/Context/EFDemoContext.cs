
namespace Demo.EF.Repositories;

public class EFDemoContext : DbContext
{

    public DbSet<Book> Books { get; set; } = null!;
    public DbSet<Author> Authors { get; set; } = null!;
    public DbSet<Borrower> Borrowers { get; set; } = null!;


    public EFDemoContext(DbContextOptions<EFDemoContext> options) : base(options)
    {
    }
    

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Author>().ToTable("Authors").HasData(new Author { Id = 1, Name = "Author 1", Email = "test@test.be" });
        modelBuilder.Entity<Author>().ToTable("Authors").HasData(new Author { Id = 2, Name = "Author 2", Email = "demo@test.com" });

        var book = new Book { Id = 1, Title = "Book 1", AuthorId = 1, Isbn = "1234567890" };


        modelBuilder.Entity<Book>().ToTable("Books").HasData(book);
        modelBuilder.Entity<Book>().ToTable("Books").HasData(new Book { Id = 2, Title = "Book 2", AuthorId = 2, Isbn = "0987654321" });

 

        //modelBuilder.Entity<Borrower>().ToTable("Borrowers").HasData(new Borrower { Id = 1, Name = "Borrower 1", Email = "leen@test.com", Books = new List<Book> { book } });

    }
}

