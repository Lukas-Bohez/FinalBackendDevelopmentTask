
public interface IPersonRepository
{
    void AddPerson(Person person);
    List<Person> GetPersons();
    Person GetPersonById(int id);
}

public class PersonRepository : IPersonRepository{
    private static List<Person> Persons = new List<Person>();

    public void AddPerson(Person person){
        person.Id = Persons.Count + 1;
        Persons.Add(person);
    }

    public List<Person> GetPersons(){
        return Persons;
    }


    public Person GetPersonById(int id){
        return Persons.FirstOrDefault(x => x.Id == id);
    }
    
}