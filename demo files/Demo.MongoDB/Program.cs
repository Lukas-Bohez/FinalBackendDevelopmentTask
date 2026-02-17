

var builder = WebApplication.CreateBuilder(args);

var configuration = new ConfigurationBuilder()
    .AddJsonFile("appsettings.json")
    .Build();

builder.Services.Configure<ApplicationSettings>(configuration.GetSection("ApplicationSettings"));


builder.Services.AddTransient<IMongoContext, MongoContext>();
builder.Services.AddTransient<IMovieRepository, MovieRepository>();
builder.Services.AddTransient<IMovieLocationRepository, MovieLocationRepository>();
builder.Services.AddTransient<IMovieService, MovieService>();
builder.Services.AddTransient<IMailService, GoogleMailService>();
builder.Services.AddAutoMapper(typeof(Program));


var app = builder.Build();

app.MapGet("/", () => "Hello World!");

app.MapGet("/movies", (IMapper mapper,IMovieService movieService) => {
    var movies = movieService.GetMovies();
    return Results.Ok(mapper.Map<List<MovieDTO>>(movies));
});

app.MapGet("/movies/{id}", (IMovieService movieService, string id) => {
    var movie = movieService.GetMovieById(id);
    return Results.Ok<Movie>(movie);
});

app.MapPost("/movies", (IMovieService movieService, Movie movie) => {
    movieService.AddMovie(movie);
    return Results.Created($"/movies/{movie.Id}", movie);
});


app.MapGet("/locations", (IMapper mapper, IMovieService movieService) => {
    var locations = movieService.GetLocations();
    return Results.Ok(locations);
});


app.Run("http://localhost:5201/");
