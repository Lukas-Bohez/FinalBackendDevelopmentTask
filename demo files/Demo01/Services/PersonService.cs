

public interface IPersonService
{
    void AddPerson(Person person);
}

public class PersonService : IPersonService{

    public void AddPerson(Person person)
    {
        Console.WriteLine($"PersonId: {person.PersonId}");
    }
}