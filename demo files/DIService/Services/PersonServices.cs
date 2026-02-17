namespace DIService.Services;

// 1. Singleton: "The Mayor" -> There is only ONE mayor in the city (Application).
public interface IMayor { Person Person { get; } }

public class MayorService : IMayor 
{
    public Person Person { get; } = new("Mayor (Singleton)", Guid.NewGuid());
}

// 2. Scoped: "The Customer" -> For this specific visit (Request), the customer is the same person.
public interface ICustomer { Person Person { get; } }

public class CustomerService : ICustomer
{
    public Person Person { get; } = new("Customer (Scoped)", Guid.NewGuid());
}

// 3. Transient: "The Passerby" -> Every time you look, you see a random new person.
public interface IPasserby { Person Person { get; } }

public class PasserbyService : IPasserby
{
    public Person Person { get; } = new("Passerby (Transient)", Guid.NewGuid());
}

// Helper service to check what IT sees vs what the Controller sees
public class FrontDeskService(
    IMayor mayor,
    ICustomer customer,
    IPasserby passerby)
{
    public Person GetMayor() => mayor.Person;
    public Person GetCustomer() => customer.Person;
    public Person GetPasserby() => passerby.Person;
}
