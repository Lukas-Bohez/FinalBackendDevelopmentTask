
using Microsoft.Extensions.Options;

namespace theorie_02.Context;

public interface IMongoContext
{
    IMongoCollection<Movie> Movies { get; }
    IMongoCollection<MovieLocation> Locations { get; }
}

public class MongoContext : IMongoContext
{
    private readonly IMongoDatabase _database;
    private readonly IMongoClient _client;

    public MongoContext(IOptions<ApplicationSettings> settings)
    {
        _client = new MongoClient(settings.Value.ConnectionString);
        _database = _client.GetDatabase("MovieDB");
    }
    
    public IMongoCollection<Movie> Movies => _database.GetCollection<Movie>("Movies");

    public IMongoCollection<MovieLocation> Locations => _database.GetCollection<MovieLocation>("Locations");

}

