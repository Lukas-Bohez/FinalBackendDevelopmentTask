 

namespace theorie_02.Models;

public class MovieLocation
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; }
    public string Location { get; set; }
}

