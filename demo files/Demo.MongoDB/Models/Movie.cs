 

namespace theorie_02.Models;

public class Movie
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; }
    public string Title { get; set; }
    public string Director { get; set; }
    public int Year { get; set; }
    public string Genre { get; set; }
    public string Description { get; set; }
    public string ImageUrl { get; set; }
    public string? Location { get; set; }
    public string LocationId { get; set; }
}

