using System;

namespace theorie_02.Services;

public interface IMovieService
{
    void AddMovie(Movie movie);
    List<Movie> GetMovies();
    Movie GetMovieById(string id);
    void DeleteMovie(string id);
    List<MovieLocation> GetLocations();
    MovieLocation GetLocationById(string id);
    void AddLocation(MovieLocation location);
    void UpdateLocation(MovieLocation location);
    void DeleteLocation(string id);
}

public class MovieService : IMovieService
{
    private readonly IMovieRepository _movieRepository;
    private readonly IMovieLocationRepository _movieLocationRepository;
    private readonly IMailService _mailService;

    public MovieService(IMovieRepository movieRepository, IMailService mailService,IMovieLocationRepository movieLocationRepository )
    {
        _movieRepository = movieRepository;
        _mailService = mailService;
        _movieLocationRepository = movieLocationRepository;
    }

    public void AddMovie(Movie movie)
    {
        if (movie.Year == 2023)
        {
            _mailService.SendEmail(movie);
        }
        _movieRepository.AddMovie(movie);
    }

    public List<Movie> GetMovies()
    {
        return _movieRepository.GetMovies();
    }

    public Movie GetMovieById(string id)
    {
        return _movieRepository.GetMovieById(id);
    }

    public void DeleteMovie(string id)
    {
        _movieRepository.DeleteMovie(id);
    }

    public List<MovieLocation> GetLocations()
    {
        return _movieLocationRepository.GetLocations();
    }

    public MovieLocation GetLocationById(string id)
    {
        return _movieLocationRepository.GetLocationById(id);
    }

    public void AddLocation(MovieLocation location)
    {
        _movieLocationRepository.AddLocation(location);
    }

    public void DeleteLocation(string id)
    {
        _movieLocationRepository.DeleteLocation(id);
    }

    public void UpdateLocation(MovieLocation location)
    {
        _movieLocationRepository.UpdateLocation(location);
    }


}

