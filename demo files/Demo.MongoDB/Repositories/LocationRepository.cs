namespace theorie_02.Repositories;

public interface IMovieLocationRepository
{
    void AddLocation(MovieLocation location);
    List<MovieLocation> GetLocations();
    MovieLocation GetLocationById(string id);
    void DeleteLocation(string id);
    void UpdateLocation(MovieLocation location);
}

public class MovieLocationRepository : IMovieLocationRepository
{
    private static List<MovieLocation> _locations = new List<MovieLocation>();
    private readonly IMongoContext _context;

    public MovieLocationRepository(IMongoContext context)
    {
        _context = context;
    }

    public void AddLocation(MovieLocation location)
    {
        _context.Locations.InsertOne(location);
    }

    public List<MovieLocation> GetLocations()
    {
        return _context.Locations.Find(m => true).ToList();
    }

    public MovieLocation GetLocationById(string id)
    {
        return _context.Locations.Find(m => m.Id == id).FirstOrDefault();
    }

    public void DeleteLocation(string id)
    {
        _context.Locations.DeleteOne(m => m.Id == id);
    }

    public void UpdateLocation(MovieLocation location)
    {
        _context.Locations.ReplaceOne(m => m.Id == location.Id, location);
    }


}

