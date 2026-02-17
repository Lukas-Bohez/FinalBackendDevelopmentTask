

namespace theorie_02.DTO;

public class MovieDTO
{
    public string Id { get; set; }
    public string Title { get; set; }
    public string Director { get; set; }
}

public class MovieProfile : Profile
{
    public MovieProfile()
    {
        CreateMap<Movie, MovieDTO>();
    }
}
 

