



namespace theorie_02.Repositories;

public interface IMovieRepository
{
    void AddMovie(Movie movie);
    List<Movie> GetMovies();
    Movie GetMovieById(string id);
    void DeleteMovie(string id);
    void UpdateMovie(Movie movie);
}

public class MovieRepository : IMovieRepository
{
    private static List<Movie> _movies = new List<Movie>();
    private readonly IMongoContext _context;

    public MovieRepository(IMongoContext context)
    {
        _context = context;
    }
    public void AddMovie(Movie movie)
    {
        _context.Movies.InsertOne(movie);
    }

    public List<Movie> GetMovies()
    {
        return _context.Movies.Find(m => true).ToList();
    }

    public Movie GetMovieById(string id)
    {
        return _context.Movies.Find(m => m.Id == id).FirstOrDefault();
    }

    public void DeleteMovie(string id)
    {
        _context.Movies.DeleteOne(m => m.Id == id);
    }

    public void UpdateMovie(Movie movie)
    {
        _context.Movies.ReplaceOne(m => m.Id == movie.Id, movie);
    }
}

