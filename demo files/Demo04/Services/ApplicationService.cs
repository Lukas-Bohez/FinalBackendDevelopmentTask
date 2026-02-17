
public interface IApplicationService
{
    void AddPerson(Person person);
    void AddPerson2(Person person);
    Task<List<Person>> GetPersons();
    Person GetPersonById(int id);
}

public class ApplicationService : IApplicationService{
    private IPersonRepository _personRepository;
    private IMailService _mailService;
    private PersonValidator _personValidator;

    public ApplicationService(IPersonRepository personRepository, IMailService mailService, PersonValidator personValidator){
        _personRepository = personRepository;
        _mailService = mailService;
        _personValidator = personValidator;
    }

    public void AddPerson2(Person person){
        var validationResult = _personValidator.Validate(person);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors);
        }
        _personRepository.AddPerson(person);
        _mailService.SendEmail(person.Email, "Welcome", "Welcome to our platform");
    }

    public void AddPerson(Person person){
        _personRepository.AddPerson(person);
        _mailService.SendEmail(person.Email, "Welcome", "Welcome to our platform");
    }


    public Task<List<Person>> GetPersons(){
        return _personRepository.GetPersons();
    }

    public Person GetPersonById(int id){
        return _personRepository.GetPersonById(id);
    }
}