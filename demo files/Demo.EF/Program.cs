var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<DbConfig>(builder.Configuration.GetSection("DbConfig"));

builder.Services.AddDbContext<EFDemoContext>(options =>
{
    var config = builder.Configuration.GetSection("DbConfig").Get<DbConfig>();
    options.UseMySql(config.Server,ServerVersion.AutoDetect(config.Server));
});

builder.Services.AddScoped<IBookRepository, BookRepository>();
builder.Services.AddScoped<IAuthorRepository, AuthorRepository>();
builder.Services.AddScoped<IBookService, BookService>();
builder.Services.AddAutoMapper(typeof(Program));

var app = builder.Build();

app.MapGet("/", () => "Hello World!");

app.MapGet("/books", async (IBookService bookService,IMapper mapper) =>
{
    var books = await bookService.GetBooksAsync();
    var bookDtos = mapper.Map<List<BookDto>>(books);
    return Results.Ok(bookDtos);
});

app.MapPost("/books", async (IBookService bookService, Book book,IMapper mapper) =>
{
    var createdBook = await bookService.AddBookAsync(book);
    var mappedBook = mapper.Map<BookDto>(createdBook);
    return Results.Created("",mappedBook);
});

app.Run("http://localhost:5176");
