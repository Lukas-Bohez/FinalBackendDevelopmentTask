

using AutoMapper;

public class PersonDTO
{
    public string Name { get; set; }
    public int Age { get; set; }
}

public class PersonProfile : Profile
{
    public PersonProfile()
    {
        CreateMap<Person, PersonDTO>();
    }
}

